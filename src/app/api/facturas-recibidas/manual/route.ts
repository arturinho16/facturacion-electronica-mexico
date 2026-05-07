import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { ensurePerfilDescargaSat, normalizarPerfilClave } from '@/lib/sat/perfiles';

function fechaCfdiComoUtc(fechaStr: string) {
    const partes = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)?(\d{2})?:?(\d{2})?:?(\d{2})?/);
    if (!partes) return new Date(fechaStr);

    const [, anio, mes, dia, hora = '00', minuto = '00', segundo = '00'] = partes;
    return new Date(Date.UTC(
        Number(anio),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minuto),
        Number(segundo)
    ));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { xmlContenido } = body;
        const perfilClave = normalizarPerfilClave(body.perfil);
        const perfil = await ensurePerfilDescargaSat(perfilClave);

        if (!xmlContenido) {
            return NextResponse.json({ error: 'No se envió el XML.' }, { status: 400 });
        }

        // Extraer datos clave usando Regex
        const getComprobanteAttr = (attr: string) => {
            const match = xmlContenido.match(new RegExp(`<(?:\\w+:)?Comprobante[^>]+${attr}=["']([^"']+)["']`, 'i'));
            return match ? match[1] : '';
        };

        const fechaEmision = getComprobanteAttr('Fecha');
        const total = getComprobanteAttr('Total');
        const moneda = getComprobanteAttr('Moneda') || 'MXN';
        const efectoCfdi = getComprobanteAttr('TipoDeComprobante') || 'I';

        const emisorMatch = xmlContenido.match(/<(?:\w+:)?Emisor([^>]+)>/i);
        let emisorRfc = '', emisorNombre = 'PROVEEDOR DESCONOCIDO';
        if (emisorMatch) {
            const rfcM = emisorMatch[1].match(/Rfc=["']([^"']+)["']/i);
            const nomM = emisorMatch[1].match(/Nombre=["']([^"']+)["']/i);
            if (rfcM) emisorRfc = rfcM[1];
            if (nomM) emisorNombre = nomM[1];
        }

        const receptorMatch = xmlContenido.match(/<(?:\w+:)?Receptor([^>]+)>/i);
        let receptorRfc = '';
        if (receptorMatch) {
            const rfcM = receptorMatch[1].match(/Rfc=["']([^"']+)["']/i);
            if (rfcM) receptorRfc = rfcM[1];
        }

        const timbreMatch = xmlContenido.match(/<(?:\w+:)?TimbreFiscalDigital([^>]+)>/i);
        let uuid = '';
        if (timbreMatch) {
            const uuidM = timbreMatch[1].match(/UUID=["']([^"']+)["']/i);
            if (uuidM) uuid = uuidM[1];
        }

        if (!uuid || !emisorRfc) {
            return NextResponse.json({ error: 'XML inválido. No se encontró UUID o RFC del Emisor.' }, { status: 400 });
        }

        // Guardado físico en la estructura de carpetas
        const fechaDoc = fechaCfdiComoUtc(fechaEmision);
        const anioStr = fechaDoc.getFullYear().toString();
        const mesStr = (fechaDoc.getMonth() + 1).toString().padStart(2, '0');

        const almacenPath = path.join(process.cwd(), 'almacen_facturas');
        const folderDest = path.join(almacenPath, perfilClave, anioStr, mesStr);

        if (!fs.existsSync(folderDest)) {
            fs.mkdirSync(folderDest, { recursive: true });
        }

        const fileName = `${emisorRfc}_${uuid}.xml`;
        const filePath = path.join(folderDest, fileName);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, xmlContenido, 'utf8');
        }

        // Guardado en Base de Datos
        await prisma.facturaRecibida.upsert({
            where: { uuid },
            update: {
                perfilId: perfil.id,
                xmlContenido,
            },
            create: {
                uuid,
                perfilId: perfil.id,
                emisorRfc,
                emisorNombre,
                receptorRfc: receptorRfc || perfil.rfc || 'SIN_RFC',
                fechaEmision: fechaDoc,
                total: parseFloat(total) || 0,
                moneda,
                efectoCfdi,
                xmlContenido,
                estadoSat: 'VIGENTE'
            }
        });

        return NextResponse.json({ ok: true, mensaje: `Factura procesada y guardada con éxito.` });

    } catch (error: unknown) {
        console.error("Error al subir XML manual:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error al subir XML manual.' },
            { status: 500 }
        );
    }
}
