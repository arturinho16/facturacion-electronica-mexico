import { NextRequest, NextResponse } from 'next/server';
import { getMailTransport } from '@/lib/configuracion';

type FacturaResumen = {
    uuid?: string;
    emisorRfc?: string;
    emisorNombre?: string;
    fechaEmision?: string;
    total?: number;
    moneda?: string;
};

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function fmt(value: number, moneda = 'MXN') {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: moneda || 'MXN',
    }).format(value || 0);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const destinatario = String(body.destinatario || '').trim().toLowerCase();
        const zipBase64 = String(body.zipBase64 || '');
        const facturas = Array.isArray(body.facturas) ? (body.facturas as FacturaResumen[]) : [];

        if (!destinatario || !zipBase64 || facturas.length === 0) {
            return NextResponse.json(
                { error: 'Faltan correo destino, facturas o archivo ZIP.' },
                { status: 400 }
            );
        }

        const total = facturas.reduce((sum, factura) => sum + Number(factura.total || 0), 0);
        const primeras = facturas.slice(0, 15);
        const restantes = facturas.length - primeras.length;

        const rows = primeras
            .map(
                (factura) => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(factura.emisorNombre || 'Proveedor')}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(factura.emisorRfc || '')}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml((factura.fechaEmision || '').slice(0, 10))}</td>
                    <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(Number(factura.total || 0), factura.moneda || 'MXN')}</td>
                </tr>`
            )
            .join('');

        const mail = await getMailTransport();

        await mail.transporter.sendMail({
            from: mail.from,
            to: destinatario,
            subject: `Facturas recibidas seleccionadas (${facturas.length})`,
            html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
                    <h2 style="margin:0 0 12px;">Facturas recibidas seleccionadas</h2>
                    <p>Adjunto encontrarás un ZIP con <strong>${facturas.length}</strong> XML.</p>
                    <p>Total seleccionado: <strong>${fmt(total)}</strong></p>
                    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:16px;">
                        <thead>
                            <tr style="background:#f8fafc;text-align:left;">
                                <th style="padding:8px;border-bottom:1px solid #cbd5e1;">Emisor</th>
                                <th style="padding:8px;border-bottom:1px solid #cbd5e1;">RFC</th>
                                <th style="padding:8px;border-bottom:1px solid #cbd5e1;">Fecha</th>
                                <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    ${restantes > 0 ? `<p>Y ${restantes} facturas mas.</p>` : ''}
                </div>
            `,
            attachments: [
                {
                    filename: `Facturas_recibidas_${new Date().toISOString().slice(0, 10)}.zip`,
                    content: zipBase64,
                    encoding: 'base64',
                },
            ],
        });

        return NextResponse.json({ ok: true, mensaje: `Correo enviado a ${destinatario}` });
    } catch (error: unknown) {
        console.error('Error enviando facturas recibidas:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error al enviar correo.' },
            { status: 500 }
        );
    }
}
