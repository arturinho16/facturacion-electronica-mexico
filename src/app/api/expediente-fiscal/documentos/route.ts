import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CAPTURA_DESHABILITADA =
  'El expediente fiscal ya no permite capturar ni subir documentos manualmente. Usa /api/expediente-fiscal/descargas para consultar documentos del SAT.';

export async function GET() {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json({
    documentos: [],
    resumen: { total: 0, pendientes: 0, vigentes: 0, conArchivo: 0 },
    mensaje: CAPTURA_DESHABILITADA,
  });
}

export async function POST() {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json({ error: CAPTURA_DESHABILITADA }, { status: 410 });
}
