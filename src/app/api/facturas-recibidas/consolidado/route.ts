import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fechaCfdiKey(fecha: string) {
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha.slice(0, 10);

    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(parsed);
}

function extraerFechaCfdi(xmlContenido?: string | null) {
    if (!xmlContenido) return '';
    const match = xmlContenido.match(/<(?:\w+:)?Comprobante[^>]*\sFecha=["']([^"']+)["']/i);
    return match?.[1] || '';
}

export async function GET(req: NextRequest) {
    try {
        const mes = String(req.nextUrl.searchParams.get('mes') || '').trim();
        const receptorRfc = String(req.nextUrl.searchParams.get('rfc') || '').trim().toUpperCase();
        const q = String(req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

        const facturas = await prisma.facturaRecibida.findMany({
            where: {
                ...(receptorRfc ? { receptorRfc } : {}),
            },
            orderBy: { fechaEmision: 'asc' },
            include: {
                perfil: {
                    select: {
                        clave: true,
                        nombre: true,
                    },
                },
            },
        });

        const filtradas = facturas.filter((factura) => {
            const fechaKey = fechaCfdiKey(extraerFechaCfdi(factura.xmlContenido) || factura.fechaEmision.toISOString());
            if (mes && fechaKey.slice(0, 7) !== mes) return false;

            if (!q) return true;

            return (
                factura.receptorRfc.toLowerCase().includes(q) ||
                factura.emisorRfc.toLowerCase().includes(q) ||
                factura.emisorNombre.toLowerCase().includes(q) ||
                factura.uuid.toLowerCase().includes(q) ||
                fechaKey.includes(q)
            );
        });

        return NextResponse.json(
            filtradas.map((factura) => ({
                id: factura.id,
                uuid: factura.uuid,
                perfilClave: factura.perfil?.clave || 'principal',
                perfilNombre: factura.perfil?.nombre || 'RFC principal',
                emisorRfc: factura.emisorRfc,
                emisorNombre: factura.emisorNombre,
                receptorRfc: factura.receptorRfc,
                fechaEmision: factura.fechaEmision,
                fechaKey: fechaCfdiKey(extraerFechaCfdi(factura.xmlContenido) || factura.fechaEmision.toISOString()),
                total: Number(factura.total),
                moneda: factura.moneda,
                estadoSat: factura.estadoSat,
                xmlContenido: factura.xmlContenido,
            }))
        );
    } catch (error: unknown) {
        console.error('Error obteniendo consolidado de facturas recibidas:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error obteniendo consolidado.' },
            { status: 500 }
        );
    }
}
