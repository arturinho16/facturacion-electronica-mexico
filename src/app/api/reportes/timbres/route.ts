import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session-server';
import { getSemanaAnterior, getTimbresReporte } from '@/lib/timbres';
import { startTimbresReportScheduler } from '@/lib/timbres-scheduler';

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
  const accept = req.headers.get('accept') || '';
  const hasApiQuery = req.nextUrl.searchParams.size > 0;
  if (accept.includes('text/html') && !hasApiQuery) {
    return NextResponse.redirect(new URL('/reportes/timbres', req.url));
  }

  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });
  startTimbresReportScheduler();

  const { searchParams } = new URL(req.url);
  const preset = searchParams.get('preset');
  const semanaAnterior = preset === 'semana-anterior' ? getSemanaAnterior() : null;
  const desde = semanaAnterior?.desde || parseDate(searchParams.get('desde'));
  const hasta = semanaAnterior?.hasta || parseDate(searchParams.get('hasta'), true);

  const reporte = await getTimbresReporte({
    desde,
    hasta,
    tipo: searchParams.get('tipo') || undefined,
    q: searchParams.get('q') || undefined,
    receptorRfc: searchParams.get('receptorRfc') || undefined,
  });

  return NextResponse.json({
    ...reporte,
    filtros: {
      desde: desde?.toISOString() || null,
      hasta: hasta?.toISOString() || null,
    },
  });
}
