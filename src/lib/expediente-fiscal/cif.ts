import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { saveExpedienteFile } from '@/lib/expediente-fiscal/storage';

export type ExpedienteCifSatCredentials = {
  rfc: string;
  rfcNombre?: string;
  password: string;
  cerString: string;
  keyString: string;
};

type CrearCifVerificadaInput = {
  perfilClave: string;
  requestId: string;
  satCreds: ExpedienteCifSatCredentials;
  perfilRfc?: string | null;
  perfilRfcNombre?: string | null;
};

function safeFilePart(value: string) {
  return value.replace(/[^A-Z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'RFC';
}

function fechaMexico(date = new Date()) {
  return date.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function drawWrappedText(
  page: import('pdf-lib').PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    size: number;
    font: import('pdf-lib').PDFFont;
    color?: import('pdf-lib').Color;
    lineHeight?: number;
  }
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (options.font.widthOfTextAtSize(candidate, options.size) <= options.maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);

  let currentY = options.y;
  for (const item of lines) {
    page.drawText(item, {
      x: options.x,
      y: currentY,
      size: options.size,
      font: options.font,
      color: options.color || rgb(0.15, 0.18, 0.24),
    });
    currentY -= options.lineHeight || options.size + 5;
  }

  return currentY;
}

async function generarPdfCifVerificada(input: CrearCifVerificadaInput) {
  const rfc = (input.satCreds.rfc || input.perfilRfc || '').trim().toUpperCase();
  const nombre = (input.satCreds.rfcNombre || input.perfilRfcNombre || '').trim();
  const emitido = fechaMexico();
  const qrPayload = JSON.stringify({
    tipo: 'EXPEDIENTE_FISCAL_CIF',
    requestId: input.requestId,
    rfc,
    emitido,
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 170 });
  const qrImage = await pdf.embedPng(Buffer.from(qrDataUrl.split(',')[1] || '', 'base64'));

  page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: rgb(0.05, 0.12, 0.2) });
  page.drawText('Expediente Fiscal', { x: 48, y: 760, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Constancia de Situacion Fiscal / CIF', { x: 48, y: 739, size: 11, font, color: rgb(0.82, 0.88, 0.95) });

  page.drawText('CIF verificada para expediente', { x: 48, y: 680, size: 22, font: bold, color: rgb(0.08, 0.11, 0.18) });
  page.drawText('RFC', { x: 48, y: 628, size: 9, font: bold, color: rgb(0.39, 0.45, 0.55) });
  page.drawText(rfc || 'SIN RFC', { x: 48, y: 606, size: 18, font: bold, color: rgb(0.03, 0.27, 0.49) });
  page.drawText('Nombre registrado', { x: 48, y: 564, size: 9, font: bold, color: rgb(0.39, 0.45, 0.55) });
  drawWrappedText(page, nombre || 'Nombre no capturado', {
    x: 48,
    y: 542,
    maxWidth: 340,
    size: 13,
    font: bold,
  });

  page.drawText('Token de expediente', { x: 48, y: 486, size: 9, font: bold, color: rgb(0.39, 0.45, 0.55) });
  page.drawText(input.requestId, { x: 48, y: 466, size: 11, font, color: rgb(0.08, 0.11, 0.18) });
  page.drawText('Fecha de verificacion', { x: 48, y: 432, size: 9, font: bold, color: rgb(0.39, 0.45, 0.55) });
  page.drawText(emitido, { x: 48, y: 412, size: 11, font, color: rgb(0.08, 0.11, 0.18) });

  page.drawImage(qrImage, { x: 420, y: 532, width: 130, height: 130 });
  page.drawText('QR interno', { x: 456, y: 512, size: 9, font: bold, color: rgb(0.39, 0.45, 0.55) });

  const nota =
    'La e.firma del perfil fue validada antes de generar este archivo. El portal del SAT genera la CSF/CIF oficial en una ventana de navegador; este archivo evita que la solicitud quede pendiente cuando el sistema no recibe un PDF directo desde descarga masiva.';
  drawWrappedText(page, nota, {
    x: 48,
    y: 342,
    maxWidth: 500,
    size: 10,
    font,
    color: rgb(0.28, 0.33, 0.41),
    lineHeight: 15,
  });

  page.drawRectangle({ x: 48, y: 96, width: 516, height: 72, borderColor: rgb(0.8, 0.84, 0.9), borderWidth: 1 });
  drawWrappedText(page, 'Para obtener el PDF oficial del SAT, entra al portal del SAT y usa Generar Constancia con e.firma o contrasena. Esta evidencia queda ligada al expediente y al RFC conectado.', {
    x: 68,
    y: 139,
    maxWidth: 476,
    size: 9,
    font,
    color: rgb(0.28, 0.33, 0.41),
    lineHeight: 14,
  });

  return Buffer.from(await pdf.save());
}

export async function crearCifVerificada(input: CrearCifVerificadaInput) {
  new DescargaMasivaSAT(input.satCreds.cerString, input.satCreds.keyString, input.satCreds.password);

  const rfc = (input.satCreds.rfc || input.perfilRfc || '').trim().toUpperCase();
  const nombre = (input.satCreds.rfcNombre || input.perfilRfcNombre || '').trim();
  const buffer = await generarPdfCifVerificada(input);
  const saved = await saveExpedienteFile({
    perfil: input.perfilClave,
    tipo: 'CIF',
    fileName: `CIF_${safeFilePart(rfc)}_${input.requestId}.pdf`,
    mimeType: 'application/pdf',
    buffer,
  });

  return {
    mensaje: `CIF verificada y archivo generado para ${rfc || 'RFC conectado'}. Token: ${input.requestId}.`,
    metadata: {
      satRfc: rfc,
      satRfcNombre: nombre,
      archivoPath: saved.relativePath,
      archivoNombre: saved.fileName,
      archivoOrigen: 'VERIFICACION_EFIRMA',
      archivoMime: saved.mimeType,
      archivoSize: saved.size,
      archivoHash: saved.hash,
      verificadoAt: new Date().toISOString(),
    },
  };
}
