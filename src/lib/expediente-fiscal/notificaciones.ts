import { getActiveConfig, getMailTransport } from '@/lib/configuracion';

export type ExpedienteFiscalNotificacion = {
  requestId: string;
  tipoLabel: string;
  rfc: string;
  rfcNombre?: string;
  fecha?: string | null;
  mensaje: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function enviarNotificacionExpedienteFiscal(input: ExpedienteFiscalNotificacion) {
  const config = await getActiveConfig();
  const destino = config?.email || config?.correoRemitenteEmail || config?.correoUsuario;

  if (!destino) {
    throw new Error('No hay correo destino configurado para avisar del expediente fiscal.');
  }

  const { transporter, from } = await getMailTransport();
  const asunto = `Expediente fiscal listo: ${input.tipoLabel}`;
  const fechaTexto = input.fecha ? `Fecha consultada: ${input.fecha}` : 'Sin fecha requerida';

  await transporter.sendMail({
    from,
    to: destino,
    subject: asunto,
    text: [
      'Ya esta listo un recurso del expediente fiscal.',
      `Token: ${input.requestId}`,
      `Documento: ${input.tipoLabel}`,
      `RFC: ${input.rfc}${input.rfcNombre ? ` - ${input.rfcNombre}` : ''}`,
      fechaTexto,
      input.mensaje,
      '',
      'Entra al modulo de Expediente Fiscal para revisarlo.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <h2 style="margin:0 0 12px;">Expediente fiscal listo</h2>
        <p>Ya esta listo un recurso solicitado en el expediente fiscal.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:16px;">
          <tbody>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Token</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(input.requestId)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Documento</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(input.tipoLabel)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">RFC</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(input.rfc)}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Fecha</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(fechaTexto)}</td></tr>
          </tbody>
        </table>
        <p style="margin-top:16px;">${escapeHtml(input.mensaje)}</p>
        <p>Entra al modulo de Expediente Fiscal para revisarlo.</p>
      </div>`,
  });

  return destino;
}
