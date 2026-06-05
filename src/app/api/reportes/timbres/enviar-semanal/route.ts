import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session-server';
import { enviarReporteTimbresSemanal, getSemanaAnterior } from '@/lib/timbres';

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { desde, hasta } = getSemanaAnterior();
  const result = await enviarReporteTimbresSemanal(desde, hasta);
  return NextResponse.json({ ...result, desde, hasta });
}
