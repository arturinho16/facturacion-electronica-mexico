import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json(
    { error: 'El ZIP de documentos manuales fue deshabilitado. El expediente fiscal ahora consulta documentos directamente del SAT.' },
    { status: 410 }
  );
}
