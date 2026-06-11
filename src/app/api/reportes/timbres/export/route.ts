import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';
import { buildTimbresCsv, buildTimbresWhere, getSemanaAnterior } from '@/lib/timbres';

function parseDate(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const preset = searchParams.get('preset');
  const semanaAnterior = preset === 'semana-anterior' ? getSemanaAnterior() : null;
  const desde = semanaAnterior?.desde || parseDate(searchParams.get('desde'));
  const hasta = semanaAnterior?.hasta || parseDate(searchParams.get('hasta'), true);
  const where = buildTimbresWhere({
    desde,
    hasta,
    tipo: searchParams.get('tipo') || undefined,
    q: searchParams.get('q') || undefined,
    receptorRfc: searchParams.get('receptorRfc') || undefined,
  });

  const items = await prisma.timbreUso.findMany({ where, orderBy: { fechaTimbrado: 'asc' } });
  const csv = buildTimbresCsv(items);
  const filename = `reporte-timbres-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
