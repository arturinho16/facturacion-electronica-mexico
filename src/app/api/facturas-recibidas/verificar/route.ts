import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { getSatCredentialsAsBinary } from '@/lib/sat/session-store';
import { getActiveConfig, getFielCredentialsAsBinary, getMailTransport } from '@/lib/configuracion';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIMITE_BYTES = 10 * 1024 * 1024 * 1024;
const UMBRAL_ALERTA_BYTES = LIMITE_BYTES;

type FacturaNuevaNotificacion = {
    uuid: string;
    emisorRfc: string;
    emisorNombre: string;
    fechaEmision: Date;
    total: number;
    moneda: string;
};

function asegurarDirectorio(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function obtenerTamanoCarpeta(dirPath: string): number {
    let size = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            size += obtenerTamanoCarpeta(filePath);
        } else {
            size += stats.size;
        }
    }

    return size;
}

function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function extraerAtributo(xml: string, tagName: string, attr: string): string {
    const regex = new RegExp(`<(?:\\w+:)?${tagName}[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
    const match = xml.match(regex);
    return match?.[1] ?? '';
}

function parseXmlMetadata(xmlContenidoRaw: string) {
    const xmlContenido = xmlContenidoRaw.replace(/^\uFEFF/, '').trim();

    return {
        xmlContenido,
        fechaEmision: extraerAtributo(xmlContenido, 'Comprobante', 'Fecha'),
        total: extraerAtributo(xmlContenido, 'Comprobante', 'Total'),
        moneda: extraerAtributo(xmlContenido, 'Comprobante', 'Moneda') || 'MXN',
        efectoCfdi: extraerAtributo(xmlContenido, 'Comprobante', 'TipoDeComprobante') || 'I',
        emisorRfc: extraerAtributo(xmlContenido, 'Emisor', 'Rfc'),
        emisorNombre: extraerAtributo(xmlContenido, 'Emisor', 'Nombre') || 'PROVEEDOR DESCONOCIDO',
        receptorRfc: extraerAtributo(xmlContenido, 'Receptor', 'Rfc'),
        uuid: extraerAtributo(xmlContenido, 'TimbreFiscalDigital', 'UUID'),
    };
}

function normalizarFecha(fechaStr?: string, fallback = new Date()) {
    if (!fechaStr) return fallback;
    const fecha = new Date(fechaStr);
    return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

function normalizarTexto(texto: string) {
    return (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatCurrency(value: number, moneda: string) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: moneda || 'MXN',
    }).format(value || 0);
}

function formatDateMx(date: Date) {
    return new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

async function enviarNotificacionFacturasRecibidas(facturas: FacturaNuevaNotificacion[]) {
    if (facturas.length === 0) return null;

    const config = await getActiveConfig();
    const destino = config?.email || config?.correoRemitenteEmail || config?.correoUsuario;

    if (!destino) {
        throw new Error('No hay correo destino configurado para avisar de facturas recibidas.');
    }

    const { transporter, from } = await getMailTransport();
    const totalImporte = facturas.reduce((sum, factura) => sum + factura.total, 0);
    const primerasFacturas = facturas.slice(0, 10);
    const restantes = facturas.length - primerasFacturas.length;

    const filasHtml = primerasFacturas
        .map(
            (factura) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(factura.emisorNombre)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(factura.emisorRfc)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formatDateMx(factura.fechaEmision)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(factura.total, factura.moneda)}</td>
                </tr>`
        )
        .join('');

    const texto = [
        `Ya hay facturas recibidas nuevas en el sistema: ${facturas.length}.`,
        `Total detectado: ${formatCurrency(totalImporte, 'MXN')}.`,
        '',
        ...primerasFacturas.map(
            (factura) =>
                `- ${factura.emisorNombre} (${factura.emisorRfc}) | ${formatDateMx(factura.fechaEmision)} | ${formatCurrency(factura.total, factura.moneda)}`
        ),
        restantes > 0 ? `... y ${restantes} mas.` : '',
        '',
        'Entra al modulo de Facturas recibidas para revisarlas.',
    ]
        .filter(Boolean)
        .join('\n');

    await transporter.sendMail({
        from,
        to: destino,
        subject: `Facturas recibidas nuevas: ${facturas.length}`,
        text: texto,
        html: `
            <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
                <h2 style="margin:0 0 12px;">Ya hay facturas recibidas nuevas</h2>
                <p>Se descargaron <strong>${facturas.length}</strong> XML nuevos desde el SAT.</p>
                <p>Total detectado: <strong>${formatCurrency(totalImporte, 'MXN')}</strong></p>
                <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:16px;">
                    <thead>
                        <tr style="background:#f8fafc;text-align:left;">
                            <th style="padding:8px;border-bottom:1px solid #cbd5e1;">Emisor</th>
                            <th style="padding:8px;border-bottom:1px solid #cbd5e1;">RFC</th>
                            <th style="padding:8px;border-bottom:1px solid #cbd5e1;">Fecha</th>
                            <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${filasHtml}</tbody>
                </table>
                ${restantes > 0 ? `<p>Y ${restantes} mas.</p>` : ''}
                <p style="margin-top:16px;">Entra al modulo de Facturas recibidas para revisarlas.</p>
            </div>`,
    });

    return destino;
}

function esErrorLimiteDescargaSAT(error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error ?? '');
    const texto = normalizarTexto(mensaje);

    return (
        texto.includes('maximo de descargas permitidas') ||
        texto.includes('limite de descargas por folio por dia') ||
        texto.includes('limite de descargas')
    );
}

function fechaClaveMx(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function getControlDir(almacenPath: string) {
    const controlDir = path.join(almacenPath, '_control_paquetes');
    asegurarDirectorio(controlDir);
    return controlDir;
}

function getDonePath(controlDir: string, paqueteId: string) {
    return path.join(controlDir, `${paqueteId}.done.json`);
}

function getLimitedPath(controlDir: string, paqueteId: string) {
    return path.join(controlDir, `${paqueteId}.limited.json`);
}

function marcarPaqueteProcesado(
    controlDir: string,
    paqueteId: string,
    data: Record<string, unknown> = {}
) {
    const donePath = getDonePath(controlDir, paqueteId);
    const limitedPath = getLimitedPath(controlDir, paqueteId);

    fs.writeFileSync(
        donePath,
        JSON.stringify(
            {
                paqueteId,
                processedAt: new Date().toISOString(),
                ...data,
            },
            null,
            2
        ),
        'utf8'
    );

    if (fs.existsSync(limitedPath)) {
        fs.unlinkSync(limitedPath);
    }
}

function marcarPaqueteLimitado(controlDir: string, paqueteId: string, requestId: string, motivo: string) {
    const limitedPath = getLimitedPath(controlDir, paqueteId);

    fs.writeFileSync(
        limitedPath,
        JSON.stringify(
            {
                paqueteId,
                requestId,
                motivo,
                limitedAt: new Date().toISOString(),
                dayKeyMx: fechaClaveMx(),
            },
            null,
            2
        ),
        'utf8'
    );
}

function fueLimitadoHoy(controlDir: string, paqueteId: string) {
    const limitedPath = getLimitedPath(controlDir, paqueteId);

    if (!fs.existsSync(limitedPath)) {
        return false;
    }

    try {
        const raw = fs.readFileSync(limitedPath, 'utf8');
        const parsed = JSON.parse(raw) as { dayKeyMx?: string };
        return parsed.dayKeyMx === fechaClaveMx();
    } catch {
        return false;
    }
}

function guardarMetadataTxt(
    almacenPath: string,
    paqueteId: string,
    txtEntries: AdmZip.IZipEntry[]
) {
    const metadataDir = path.join(almacenPath, '_metadata', String(new Date().getFullYear()));
    asegurarDirectorio(metadataDir);

    for (const entry of txtEntries) {
        const fileName = `${paqueteId}__${path.basename(entry.entryName)}`;
        const txtPath = path.join(metadataDir, fileName);
        const txtContenido = entry.getData().toString('utf8');
        fs.writeFileSync(txtPath, txtContenido, 'utf8');
    }
}

export async function GET() {
    try {
        const satSession = getSatCredentialsAsBinary() || await getFielCredentialsAsBinary();

        if (!satSession) {
            return NextResponse.json(
                { error: 'No hay una sesión SAT activa. Inicia sesión con tu .cer, .key y contraseña.' },
                { status: 401 }
            );
        }

        const pendientes = await prisma.solicitudSat.findMany({
            where: {
                estado: {
                    in: ['PENDIENTE', 'EN_PROCESO', 'REINTENTO_MANANA'],
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (pendientes.length === 0) {
            return NextResponse.json({
                ok: true,
                mensaje: 'No hay solicitudes en proceso.',
            });
        }

        const almacenPath = path.join(process.cwd(), 'almacen_facturas');
        asegurarDirectorio(almacenPath);

        const controlDir = getControlDir(almacenPath);

        let tamanoActual = obtenerTamanoCarpeta(almacenPath);

        if (tamanoActual >= UMBRAL_ALERTA_BYTES) {
            await prisma.solicitudSat.updateMany({
                where: { id: { in: pendientes.map((p) => p.id) } },
                data: {
                    estado: 'RESPALDO_REQUERIDO',
                    mensajeSat: `RESPALDO URGENTE: el almacenamiento local llegó a ${formatBytes(tamanoActual)} de 10 GB. Debes respaldar antes de descargar más XML.`,
                },
            });

            return NextResponse.json(
                {
                    error: `⚠️ RESPALDO URGENTE: el almacenamiento local llegó a ${formatBytes(tamanoActual)} de 10 GB. Haz un respaldo antes de seguir descargando.`,
                },
                { status: 400 }
            );
        }

        const satService = new DescargaMasivaSAT(
            satSession.cerString,
            satSession.keyString,
            satSession.password
        );

        let nuevasFacturas = 0;
        const facturasNuevasNotificacion: FacturaNuevaNotificacion[] = [];
        let xmlActualizadosGlobal = 0;
        let xmlSaltadosGlobal = 0;
        let paquetesMetadataGlobal = 0;
        let paquetesYaProcesadosGlobal = 0;
        let paquetesLimitadosGlobal = 0;

        const resumen: Record<string, number> = {
            PENDIENTE: 0,
            EN_PROCESO: 0,
            COMPLETADA: 0,
            SIN_RESULTADOS: 0,
            DUPLICADA: 0,
            RECHAZADA: 0,
            ERROR: 0,
            VENCIDA: 0,
            RESPALDO_REQUERIDO: 0,
            REINTENTO_MANANA: 0,
        };

        const incrementarResumen = (estado: string) => {
            resumen[estado] = (resumen[estado] || 0) + 1;
        };

        for (const solicitud of pendientes) {
            try {
                const resultado = await satService.verificarSolicitud(solicitud.requestId);
                const estadoSolicitud = resultado.estadoSolicitud;
                const mensajeSolicitud = resultado.mensaje;
                const paqueteIds = resultado.paqueteIds;

                if (estadoSolicitud !== 'COMPLETADA') {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: estadoSolicitud,
                            mensajeSat: mensajeSolicitud,
                        },
                    });

                    incrementarResumen(estadoSolicitud);
                    continue;
                }

                let storageStop = false;
                let bloqueoPorLimiteSAT = false;

                let xmlProcesadosSolicitud = 0;
                let xmlNuevosSolicitud = 0;
                let xmlActualizadosSolicitud = 0;
                let xmlSaltadosSolicitud = 0;
                let paquetesDescargadosSolicitud = 0;
                let paquetesMetadataSolicitud = 0;
                let paquetesYaProcesadosSolicitud = 0;
                let paquetesLimitadosSolicitud = 0;

                for (const paqueteId of paqueteIds) {
                    tamanoActual = obtenerTamanoCarpeta(almacenPath);

                    if (tamanoActual >= UMBRAL_ALERTA_BYTES) {
                        storageStop = true;
                        break;
                    }

                    const donePath = getDonePath(controlDir, paqueteId);

                    if (fs.existsSync(donePath)) {
                        console.log('[SAT] Paquete ya procesado anteriormente, se omite:', paqueteId);
                        paquetesYaProcesadosSolicitud++;
                        paquetesYaProcesadosGlobal++;
                        continue;
                    }

                    if (fueLimitadoHoy(controlDir, paqueteId)) {
                        console.log('[SAT] Paquete bloqueado previamente por límite, se omite hoy:', paqueteId);
                        bloqueoPorLimiteSAT = true;
                        paquetesLimitadosSolicitud++;
                        paquetesLimitadosGlobal++;
                        continue;
                    }

                    let base64Zip: string;

                    try {
                        base64Zip = await satService.descargarPaquete(paqueteId);
                        paquetesDescargadosSolicitud++;
                    } catch (error) {
                        if (esErrorLimiteDescargaSAT(error)) {
                            const mensajeError = error instanceof Error ? error.message : String(error ?? '');

                            console.warn('[SAT] Límite de descargas por día en paquete:', paqueteId, mensajeError);

                            marcarPaqueteLimitado(
                                controlDir,
                                paqueteId,
                                solicitud.requestId,
                                mensajeError || 'Máximo de descargas permitidas'
                            );

                            bloqueoPorLimiteSAT = true;
                            paquetesLimitadosSolicitud++;
                            paquetesLimitadosGlobal++;
                            continue;
                        }

                        throw error;
                    }

                    const zipBuffer = Buffer.from(base64Zip, 'base64');

                    if (tamanoActual + zipBuffer.length > LIMITE_BYTES) {
                        storageStop = true;
                        break;
                    }

                    const zip = new AdmZip(zipBuffer);
                    const zipEntries = zip.getEntries();

                    console.log('[SAT] Paquete:', paqueteId);
                    console.log(
                        '[SAT] Entradas ZIP:',
                        zipEntries.map((entry) => entry.entryName)
                    );

                    const xmlEntries = zipEntries.filter(
                        (entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml')
                    );

                    const txtEntries = zipEntries.filter(
                        (entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.txt')
                    );

                    if (xmlEntries.length === 0 && txtEntries.length > 0) {
                        guardarMetadataTxt(almacenPath, paqueteId, txtEntries);

                        marcarPaqueteProcesado(controlDir, paqueteId, {
                            requestId: solicitud.requestId,
                            tipo: 'METADATA',
                            txtCount: txtEntries.length,
                            xmlCount: 0,
                        });

                        paquetesMetadataSolicitud++;
                        paquetesMetadataGlobal++;
                        continue;
                    }

                    let huboContenidoUtil = false;

                    for (const entry of xmlEntries) {
                        const xmlRaw = entry.getData().toString('utf8');
                        const meta = parseXmlMetadata(xmlRaw);

                        console.log('[SAT] XML detectado:', {
                            entry: entry.entryName,
                            uuid: meta.uuid,
                            emisorRfc: meta.emisorRfc,
                            receptorRfc: meta.receptorRfc,
                        });

                        if (!meta.uuid || !meta.emisorRfc) {
                            xmlSaltadosSolicitud++;
                            xmlSaltadosGlobal++;
                            continue;
                        }

                        const bytesXml = Buffer.byteLength(meta.xmlContenido, 'utf8');

                        tamanoActual = obtenerTamanoCarpeta(almacenPath);

                        if (tamanoActual + bytesXml > LIMITE_BYTES) {
                            storageStop = true;
                            break;
                        }

                        const fechaDoc = normalizarFecha(meta.fechaEmision, solicitud.fechaFin);

                        const anioStr = String(fechaDoc.getFullYear());
                        const mesStr = String(fechaDoc.getMonth() + 1).padStart(2, '0');

                        const folderDest = path.join(almacenPath, anioStr, mesStr);
                        asegurarDirectorio(folderDest);

                        const fileName = `${meta.emisorRfc}_${meta.uuid}.xml`;
                        const filePath = path.join(folderDest, fileName);
                        const archivoYaExiste = fs.existsSync(filePath);

                        if (!archivoYaExiste) {
                            fs.writeFileSync(filePath, meta.xmlContenido, 'utf8');
                            tamanoActual += bytesXml;
                            nuevasFacturas++;
                            xmlNuevosSolicitud++;
                            facturasNuevasNotificacion.push({
                                uuid: meta.uuid,
                                emisorRfc: meta.emisorRfc,
                                emisorNombre: meta.emisorNombre,
                                fechaEmision: fechaDoc,
                                total: parseFloat(meta.total) || 0,
                                moneda: meta.moneda || 'MXN',
                            });
                        } else {
                            xmlActualizadosSolicitud++;
                            xmlActualizadosGlobal++;
                        }

                        const existente = await prisma.facturaRecibida.findUnique({
                            where: { uuid: meta.uuid },
                            select: { id: true },
                        });

                        await prisma.facturaRecibida.upsert({
                            where: { uuid: meta.uuid },
                            update: {
                                emisorRfc: meta.emisorRfc,
                                emisorNombre: meta.emisorNombre,
                                receptorRfc: meta.receptorRfc || satSession.rfc,
                                fechaEmision: fechaDoc,
                                total: parseFloat(meta.total) || 0,
                                moneda: meta.moneda,
                                efectoCfdi: meta.efectoCfdi,
                                xmlContenido: meta.xmlContenido,
                                estadoSat: 'VIGENTE',
                            },
                            create: {
                                uuid: meta.uuid,
                                emisorRfc: meta.emisorRfc,
                                emisorNombre: meta.emisorNombre,
                                receptorRfc: meta.receptorRfc || satSession.rfc,
                                fechaEmision: fechaDoc,
                                total: parseFloat(meta.total) || 0,
                                moneda: meta.moneda,
                                efectoCfdi: meta.efectoCfdi,
                                xmlContenido: meta.xmlContenido,
                                estadoSat: 'VIGENTE',
                            },
                        });

                        if (existente) {
                            // ya fue contado como actualizado por archivo local si aplicó
                        }

                        xmlProcesadosSolicitud++;
                        huboContenidoUtil = true;
                    }

                    if (storageStop) {
                        break;
                    }

                    if (huboContenidoUtil || xmlEntries.length > 0 || txtEntries.length > 0) {
                        marcarPaqueteProcesado(controlDir, paqueteId, {
                            requestId: solicitud.requestId,
                            tipo: xmlEntries.length > 0 ? 'CFDI' : 'DESCONOCIDO',
                            xmlCount: xmlEntries.length,
                            txtCount: txtEntries.length,
                        });
                    }
                }

                if (storageStop) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: 'RESPALDO_REQUERIDO',
                            mensajeSat:
                                'RESPALDO URGENTE: se alcanzó el límite de 10 GB de almacenamiento local. Debes respaldar antes de continuar con más descargas.',
                        },
                    });

                    incrementarResumen('RESPALDO_REQUERIDO');
                    continue;
                }

                if (bloqueoPorLimiteSAT) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                                estado: 'REINTENTO_MANANA',
                                mensajeSat: [
                                mensajeSolicitud,
                                `Paquetes descargados hoy: ${paquetesDescargadosSolicitud}`,
                                `Paquetes limitados por SAT: ${paquetesLimitadosSolicitud}`,
                                xmlProcesadosSolicitud > 0 ? `XML procesados: ${xmlProcesadosSolicitud}` : '',
                                paquetesMetadataSolicitud > 0 ? `Paquetes metadata: ${paquetesMetadataSolicitud}` : '',
                                paquetesYaProcesadosSolicitud > 0 ? `Paquetes ya procesados: ${paquetesYaProcesadosSolicitud}` : '',
                                'El SAT bloqueó temporalmente la descarga por límite diario. No reintentes hoy este mismo paquete; vuelve a intentar mañana.',
                            ]
                                .filter(Boolean)
                                .join(' | '),
                        },
                    });

                    incrementarResumen('REINTENTO_MANANA');
                    continue;
                }

                if (xmlProcesadosSolicitud > 0) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: 'COMPLETADA',
                            mensajeSat: [
                                mensajeSolicitud,
                                `Paquetes reportados por SAT: ${paqueteIds.length}`,
                                `Paquetes descargados: ${paquetesDescargadosSolicitud}`,
                                `XML procesados: ${xmlProcesadosSolicitud}`,
                                `XML nuevos: ${xmlNuevosSolicitud}`,
                                `XML actualizados: ${xmlActualizadosSolicitud}`,
                                xmlSaltadosSolicitud > 0 ? `XML saltados: ${xmlSaltadosSolicitud}` : '',
                                paquetesYaProcesadosSolicitud > 0 ? `Paquetes ya procesados: ${paquetesYaProcesadosSolicitud}` : '',
                            ]
                                .filter(Boolean)
                                .join(' | '),
                        },
                    });

                    incrementarResumen('COMPLETADA');
                    continue;
                }

                if (paquetesMetadataSolicitud > 0) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: 'COMPLETADA',
                            mensajeSat: [
                                mensajeSolicitud,
                                `Paquetes reportados por SAT: ${paqueteIds.length}`,
                                `Paquetes metadata: ${paquetesMetadataSolicitud}`,
                                'El SAT devolvió METADATA (.txt), no XML. Esta solicitud terminó correctamente, pero no poblará facturasRecibidas.',
                            ].join(' | '),
                        },
                    });

                    incrementarResumen('COMPLETADA');
                    continue;
                }

                if (
                    paqueteIds.length > 0 &&
                    paquetesYaProcesadosSolicitud === paqueteIds.length
                ) {
                    await prisma.solicitudSat.update({
                        where: { id: solicitud.id },
                        data: {
                            estado: 'COMPLETADA',
                            mensajeSat: [
                                mensajeSolicitud,
                                `Paquetes reportados por SAT: ${paqueteIds.length}`,
                                'Todos los paquetes ya habían sido procesados anteriormente.',
                            ].join(' | '),
                        },
                    });

                    incrementarResumen('COMPLETADA');
                    continue;
                }

                await prisma.solicitudSat.update({
                    where: { id: solicitud.id },
                    data: {
                        estado: 'COMPLETADA',
                        mensajeSat: [
                            mensajeSolicitud,
                            `Paquetes reportados por SAT: ${paqueteIds.length}`,
                            'La solicitud terminó, pero no se encontró ningún XML válido para guardar.',
                        ].join(' | '),
                    },
                });

                incrementarResumen('COMPLETADA');
            } catch (err: unknown) {
                const mensaje = err instanceof Error ? err.message : 'Error desconocido al verificar la solicitud';
                let estado = 'ERROR';

                if (esErrorLimiteDescargaSAT(err)) {
                    estado = 'REINTENTO_MANANA';
                } else if (/duplicad|5005/i.test(mensaje)) {
                    estado = 'DUPLICADA';
                } else if (/vencid|expired|estado:\s*6/i.test(mensaje)) {
                    estado = 'VENCIDA';
                } else if (/rechazad|estado:\s*5/i.test(mensaje)) {
                    estado = 'RECHAZADA';
                }

                await prisma.solicitudSat.update({
                    where: { id: solicitud.id },
                    data: {
                        estado,
                        mensajeSat: mensaje,
                    },
                });

                incrementarResumen(estado);
                console.error(`Error verificando requestId ${solicitud.requestId}:`, err);
            }
        }

        let notificacionCorreoDestino: string | null = null;
        let errorNotificacionCorreo: string | null = null;

        if (facturasNuevasNotificacion.length > 0) {
            try {
                notificacionCorreoDestino = await enviarNotificacionFacturasRecibidas(facturasNuevasNotificacion);
            } catch (error) {
                errorNotificacionCorreo = error instanceof Error ? error.message : String(error ?? '');
                console.error('Error enviando notificacion de facturas recibidas:', error);
            }
        }

        const partes: string[] = [];

        if (nuevasFacturas > 0) {
            partes.push(`XML nuevos guardados: ${nuevasFacturas}`);
        }

        if (notificacionCorreoDestino) {
            partes.push(`Correo de aviso enviado a ${notificacionCorreoDestino}`);
        }

        if (errorNotificacionCorreo) {
            partes.push(`No se pudo enviar correo de aviso: ${errorNotificacionCorreo}`);
        }

        if (xmlActualizadosGlobal > 0) {
            partes.push(`XML actualizados: ${xmlActualizadosGlobal}`);
        }

        if (xmlSaltadosGlobal > 0) {
            partes.push(`XML saltados: ${xmlSaltadosGlobal}`);
        }

        if (paquetesMetadataGlobal > 0) {
            partes.push(`Paquetes metadata: ${paquetesMetadataGlobal}`);
        }

        if (paquetesYaProcesadosGlobal > 0) {
            partes.push(`Paquetes ya procesados: ${paquetesYaProcesadosGlobal}`);
        }

        if (paquetesLimitadosGlobal > 0) {
            partes.push(`Paquetes limitados por SAT hoy: ${paquetesLimitadosGlobal}`);
        }

        for (const [estado, total] of Object.entries(resumen)) {
            if (total > 0) {
                partes.push(`${estado}: ${total}`);
            }
        }

        return NextResponse.json({
            ok: true,
            mensaje:
                partes.length > 0
                    ? `Verificación terminada. ${partes.join(' | ')}`
                    : '⏳ El SAT sigue procesando tus solicitudes.',
        });
    } catch (error: unknown) {
        console.error('Error verificando facturas:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
