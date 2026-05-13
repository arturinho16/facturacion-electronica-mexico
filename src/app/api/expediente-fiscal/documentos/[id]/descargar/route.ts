import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json(
    { error: 'La descarga manual de adjuntos fue deshabilitada. Usa la consulta directa de documentos SAT.' },
    { status: 410 }
  );
}
