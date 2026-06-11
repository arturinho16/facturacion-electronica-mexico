import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { NominaPDF } from '@/lib/pdf/NominaPDF';
import { getMailTransport } from '@/lib/configuracion';

async function generarPdfNominaBuffer(nominaData: Record<string, unknown>, logoUrl?: string | null) {
  // Envolvemos esto para que no rompa el servidor si fallan las fuentes
  const element = React.createElement(NominaPDF, { nomina: nominaData, logoUrl: logoUrl || undefined }) as unknown as Parameters<typeof renderToStream>[0];
  const stream = await renderToStream(element);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function attr(xml: string, name: string) {
  return xml.match(new RegExp(`${name}="([^"]+)"`))?.[1] || null;
}

async function obtenerCfdiTimbrado(xml: string, total: number, rfcEmisor: string, rfcReceptor: string) {
  const uuid = attr(xml, 'UUID');
  const selloCfdi = attr(xml, 'SelloCFD') || attr(xml, 'Sello');
  const selloSat = attr(xml, 'SelloSAT');
  const noCertificadoSat = attr(xml, 'NoCertificadoSAT');
  const fechaTimbrado = attr(xml, 'FechaTimbrado');
  const fe = selloCfdi?.slice(-8) || '';
  const qrUrl = uuid
    ? `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${encodeURIComponent(uuid)}&re=${encodeURIComponent(rfcEmisor)}&rr=${encodeURIComponent(rfcReceptor)}&tt=${total.toFixed(6)}&fe=${encodeURIComponent(fe)}`
    : null;

  return {
    selloCfdi,
    selloSat,
    cadenaOriginal: uuid ? `||1.1|${uuid}|${fechaTimbrado || ''}|${selloCfdi || ''}|${noCertificadoSat || ''}||` : null,
    noCertificadoSat,
    fechaTimbrado,
    qrCodeUrl: qrUrl ? await QRCode.toDataURL(qrUrl, { margin: 0, width: 160 }) : null,
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { reciboIds } = await req.json();
  const ids = Array.isArray(reciboIds) ? reciboIds.map(String) : [];
  if (!ids.length) return NextResponse.json({ error: 'reciboIds requerido.' }, { status: 400 });

  const config = await prisma.configuracionFiscal.findFirst({ where: { activo: true } });
  if (!config) return NextResponse.json({ error: 'Configuración fiscal no encontrada.' }, { status: 400 });

  const recibos = await prisma.reciboNomina.findMany({
    where: { id: { in: ids } },
    include: { empleado: true, percepciones: true, deducciones: true },
  });

  const noTimbrados = recibos.filter((recibo) => recibo.estado !== 'TIMBRADO' || !recibo.xmlTimbrado);
  if (noTimbrados.length) {
    return NextResponse.json({
      error: 'Solo se pueden finalizar recibos timbrados con XML firmado.',
      recibos: noTimbrados.map((recibo) => ({
        id: recibo.id,
        empleado: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`.trim(),
        estado: recibo.estado,
      })),
    }, { status: 409 });
  }

  const zip = new JSZip();
  const mail = await getMailTransport().catch(() => null);

  for (const r of recibos) {
    const base = `Nomina-${r.empleado.numEmpleado}-${r.id.slice(0, 8)}`;
    const xmlTimbrado = r.xmlTimbrado!;
    const cfdi = await obtenerCfdiTimbrado(xmlTimbrado, Number(r.totalNeto), config.rfc, r.empleado.rfc);

    const nominaData = {
      emisor: {
        nombre: config.razonSocial,
        rfc: config.rfc,
        direccion: config.calle ? `${config.calle} ${config.numeroExterior || ''}`.trim() : '',
        regimenFiscalDesc: config.regimenFiscal,
        registroPatronal: config.registroPatronal
      },
      folio: r.id.slice(0, 10),
      uuid: r.uuid || attr(xmlTimbrado, 'UUID'),
      empleado: { ...r.empleado, nss: r.empleado.nss || 'No especificado' },
      noNomina: r.id.slice(0, 10),
      fechaInicialPago: r.fechaInicialPago.toISOString().slice(0, 10),
      fechaFinalPago: r.fechaFinalPago.toISOString().slice(0, 10),
      diasPagados: Number(r.numDiasPagados),
      percepciones: r.percepciones,
      deducciones: r.deducciones,
      totales: {
        totalPercepciones: Number(r.totalPercepciones),
        totalDeducciones: Number(r.totalDeducciones),
        totalNeto: Number(r.totalNeto),
      },
      cfdi,
    };

    zip.file(`${base}.xml`, xmlTimbrado);

    // 2. Intentar inyectar el PDF (Si falla, creamos un TXT sin romper el ZIP)
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generarPdfNominaBuffer(nominaData, config.logoUrl);
      zip.file(`${base}.pdf`, pdfBuffer);
    } catch (e: unknown) {
      zip.file(`${base}-ERROR-PDF.txt`, `El PDF falló: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }

    // 3. Enviar correo solo si todo salió bien
    if (r.empleado.email && pdfBuffer && mail) {
      try {
        await mail.transporter.sendMail({
          from: mail.from,
          to: r.empleado.email,
          subject: 'Recibo de nomina',
          text: 'Recibo de nomina',
          attachments: [
            { filename: `${base}.pdf`, content: pdfBuffer },
            { filename: `${base}.xml`, content: xmlTimbrado, contentType: 'application/xml' },
          ],
        });
      } catch {
        console.error(`Error enviando correo a ${r.empleado.email}`);
      }
    }
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });

  const zipArrayBuffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
  return new NextResponse(new Blob([zipArrayBuffer]), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="nomina-lote-${Date.now()}.zip"`,
    },
  });
}
