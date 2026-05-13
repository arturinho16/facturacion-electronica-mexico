import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE() {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json(
    { error: 'El expediente fiscal ya no permite eliminar documentos manuales porque el módulo es sólo de consulta SAT.' },
    { status: 410 }
  );
}
