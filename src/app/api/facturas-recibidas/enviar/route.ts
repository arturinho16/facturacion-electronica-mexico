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

type AttachmentInput = {
    filename?: string;
    content?: string;
    contentType?: string;
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
        const attachmentBase64 = String(body.attachmentBase64 || zipBase64 || '');
        const attachmentFilename = String(body.attachmentFilename || `Facturas_recibidas_${new Date().toISOString().slice(0, 10)}.zip`);
        const attachmentContentType = String(body.attachmentContentType || 'application/zip');
        const asunto = String(body.asunto || `Facturas recibidas seleccionadas (${Array.isArray(body.facturas) ? body.facturas.length : 0})`);
        const titulo = String(body.titulo || 'Facturas recibidas seleccionadas');
        const descripcion = String(body.descripcion || 'Adjunto encontrarás un ZIP con los XML seleccionados.');
        const facturas = Array.isArray(body.facturas) ? (body.facturas as FacturaResumen[]) : [];
        const attachmentsInput = Array.isArray(body.attachments) ? (body.attachments as AttachmentInput[]) : [];
        const attachments = attachmentsInput.length > 0
            ? attachmentsInput
                .filter((attachment) => attachment.content && attachment.filename)
                .map((attachment) => ({
                    filename: String(attachment.filename),
                    content: String(attachment.content),
                    encoding: 'base64' as const,
                    contentType: attachment.contentType ? String(attachment.contentType) : undefined,
                }))
            : [
                {
                    filename: attachmentFilename,
                    content: attachmentBase64,
                    encoding: 'base64' as const,
                    contentType: attachmentContentType,
                },
            ];

        if (!destinatario || attachments.length === 0 || facturas.length === 0) {
            return NextResponse.json(
                { error: 'Faltan correo destino, facturas o archivo adjunto.' },
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
            subject: asunto,
            html: `
                <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
                    <h2 style="margin:0 0 12px;">${escapeHtml(titulo)}</h2>
                    <p>${escapeHtml(descripcion)}</p>
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
            attachments,
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
