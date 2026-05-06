import { NextResponse } from 'next/server';
import { getActiveConfig } from '@/lib/configuracion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getActiveConfig().catch(() => null);

  return NextResponse.json({
    nombreComercial: config?.nombreComercial || config?.razonSocial || 'TuFisTi Autofacturador',
    logoUrl: config?.logoUrl || '',
  });
}
