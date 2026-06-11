import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveConfig, getMailTransport } from '@/lib/configuracion';

type TimbreDb = PrismaClient | Prisma.TransactionClient;

export type TimbreUsoInput = {
  uuid: string | null | undefined;
  tipoCfdi: 'FACTURA' | 'NOMINA';
  facturaId?: string | null;
  reciboNominaId?: string | null;
  emisorRfc: string;
  emisorNombre?: string | null;
  receptorRfc?: string | null;
  receptorNombre?: string | null;
  serie?: string | null;
  folio?: string | null;
  total?: number | Prisma.Decimal | null;
  pac?: string | null;
  ambiente?: string | null;
  fechaTimbrado?: Date;
};

export type TimbresReporteFiltros = {
  desde?: Date;
  hasta?: Date;
  tipo?: string;
  q?: string;
  receptorRfc?: string;
};

function normalizeUuid(uuid: string | null | undefined) {
  return String(uuid || '').trim().toUpperCase();
}

function normalizeRfc(rfc: string | null | undefined) {
  return String(rfc || '').trim().toUpperCase();
}

export async function registrarTimbreUso(db: TimbreDb, input: TimbreUsoInput) {
  const uuid = normalizeUuid(input.uuid);
  if (!uuid) return null;

  const config = await db.configuracionFiscal.findFirst({
    where: { activo: true },
    select: { id: true, pacProveedor: true, pacAmbiente: true },
    orderBy: { updatedAt: 'desc' },
  });

  return db.timbreUso.upsert({
    where: { uuid },
    update: {
      tipoCfdi: input.tipoCfdi,
      facturaId: input.facturaId || null,
      reciboNominaId: input.reciboNominaId || null,
      configuracionFiscalId: config?.id || null,
      emisorRfc: normalizeRfc(input.emisorRfc),
      emisorNombre: input.emisorNombre || null,
      receptorRfc: normalizeRfc(input.receptorRfc) || null,
      receptorNombre: input.receptorNombre || null,
      serie: input.serie || null,
      folio: input.folio || null,
      total: input.total == null ? null : input.total,
      pac: input.pac || config?.pacProveedor || 'FINKOK',
      ambiente: input.ambiente || config?.pacAmbiente || 'prod',
      fechaTimbrado: input.fechaTimbrado || new Date(),
    },
    create: {
      uuid,
      tipoCfdi: input.tipoCfdi,
      facturaId: input.facturaId || null,
      reciboNominaId: input.reciboNominaId || null,
      configuracionFiscalId: config?.id || null,
      emisorRfc: normalizeRfc(input.emisorRfc),
      emisorNombre: input.emisorNombre || null,
      receptorRfc: normalizeRfc(input.receptorRfc) || null,
      receptorNombre: input.receptorNombre || null,
      serie: input.serie || null,
      folio: input.folio || null,
      total: input.total == null ? null : input.total,
      pac: input.pac || config?.pacProveedor || 'FINKOK',
      ambiente: input.ambiente || config?.pacAmbiente || 'prod',
      fechaTimbrado: input.fechaTimbrado || new Date(),
    },
  });
}

export function getSemanaAnterior(now = new Date()) {
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const inicioSemanaActual = new Date(current);
  inicioSemanaActual.setDate(current.getDate() - daysSinceMonday);
  const desde = new Date(inicioSemanaActual);
  desde.setDate(inicioSemanaActual.getDate() - 7);
  const hasta = new Date(inicioSemanaActual);
  hasta.setMilliseconds(-1);
  return { desde, hasta };
}

export function buildTimbresWhere(filtros: TimbresReporteFiltros): Prisma.TimbreUsoWhereInput {
  const where: Prisma.TimbreUsoWhereInput = {};
  if (filtros.desde || filtros.hasta) {
    where.fechaTimbrado = {};
    if (filtros.desde) where.fechaTimbrado.gte = filtros.desde;
    if (filtros.hasta) where.fechaTimbrado.lte = filtros.hasta;
  }
  if (filtros.tipo && filtros.tipo !== 'TODOS') where.tipoCfdi = filtros.tipo;
  if (filtros.receptorRfc) where.receptorRfc = { contains: filtros.receptorRfc, mode: 'insensitive' };
  if (filtros.q) {
    where.OR = [
      { uuid: { contains: filtros.q, mode: 'insensitive' } },
      { emisorRfc: { contains: filtros.q, mode: 'insensitive' } },
      { emisorNombre: { contains: filtros.q, mode: 'insensitive' } },
      { receptorRfc: { contains: filtros.q, mode: 'insensitive' } },
      { receptorNombre: { contains: filtros.q, mode: 'insensitive' } },
      { serie: { contains: filtros.q, mode: 'insensitive' } },
      { folio: { contains: filtros.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function getTimbresReporte(filtros: TimbresReporteFiltros) {
  const where = buildTimbresWhere(filtros);
  const [items, total, facturas, nomina, porReceptor] = await Promise.all([
    prisma.timbreUso.findMany({
      where,
      orderBy: { fechaTimbrado: 'desc' },
      take: 500,
    }),
    prisma.timbreUso.count({ where }),
    prisma.timbreUso.count({ where: { ...where, tipoCfdi: 'FACTURA' } }),
    prisma.timbreUso.count({ where: { ...where, tipoCfdi: 'NOMINA' } }),
    prisma.timbreUso.groupBy({
      by: ['receptorRfc', 'receptorNombre'],
      where,
      _count: { _all: true },
    }),
  ]);

  return {
    summary: { total, facturas, nomina },
    porReceptor: porReceptor
      .map((row) => ({
        receptorRfc: row.receptorRfc || 'SIN_RFC',
        receptorNombre: row.receptorNombre || 'Sin receptor',
        total: row._count._all,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20),
    items,
  };
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTimbresCsv(items: Array<{
  fechaTimbrado: Date;
  tipoCfdi: string;
  uuid: string;
  serie: string | null;
  folio: string | null;
  emisorRfc: string;
  emisorNombre: string | null;
  receptorRfc: string | null;
  receptorNombre: string | null;
  total: Prisma.Decimal | null;
  pac: string;
  ambiente: string;
}>) {
  const headers = ['Fecha', 'Tipo', 'UUID', 'Serie', 'Folio', 'Emisor RFC', 'Emisor nombre', 'Receptor RFC', 'Receptor nombre', 'Total', 'PAC', 'Ambiente'];
  const rows = items.map((item) => [
    item.fechaTimbrado.toISOString(),
    item.tipoCfdi,
    item.uuid,
    item.serie,
    item.folio,
    item.emisorRfc,
    item.emisorNombre,
    item.receptorRfc,
    item.receptorNombre,
    item.total?.toString() || '',
    item.pac,
    item.ambiente,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function enviarReporteTimbresSemanal(desde: Date, hasta: Date) {
  const config = await getActiveConfig();
  const destino = config?.email || config?.correoRemitenteEmail || config?.correoUsuario;
  if (!destino) throw new Error('Configura un correo destino en el perfil fiscal o correo saliente.');

  const where = buildTimbresWhere({ desde, hasta });
  const items = await prisma.timbreUso.findMany({ where, orderBy: { fechaTimbrado: 'asc' } });
  const reporte = await getTimbresReporte({ desde, hasta });
  const csv = buildTimbresCsv(items);
  const mail = await getMailTransport();
  const empresa = config?.nombreComercial || config?.razonSocial || 'Cliente';
  const periodo = `${desde.toISOString().slice(0, 10)} a ${hasta.toISOString().slice(0, 10)}`;

  await mail.transporter.sendMail({
    from: mail.from,
    to: destino,
    subject: `Reporte semanal de timbres - ${empresa} - ${periodo}`,
    text: [
      `Reporte semanal de timbres`,
      `Cliente: ${empresa}`,
      `Periodo: ${periodo}`,
      `Total: ${reporte.summary.total}`,
      `Facturas: ${reporte.summary.facturas}`,
      `Nomina: ${reporte.summary.nomina}`,
      '',
      'Se adjunta CSV con el detalle por UUID.',
    ].join('\n'),
    attachments: [
      {
        filename: `reporte-timbres-${desde.toISOString().slice(0, 10)}_${hasta.toISOString().slice(0, 10)}.csv`,
        content: csv,
        contentType: 'text/csv; charset=utf-8',
      },
    ],
  });

  return { ok: true, destino, total: reporte.summary.total };
}
