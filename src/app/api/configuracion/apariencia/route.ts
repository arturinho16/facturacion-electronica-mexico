import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { getActiveConfig, publicConfig } from '@/lib/configuracion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeHexColor(value: unknown) {
  const text = String(value || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text) ? text : null;
}

export async function POST(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const aparienciaHeaderColor = normalizeHexColor(body.aparienciaHeaderColor);
  if (!aparienciaHeaderColor) {
    return NextResponse.json({ error: 'Selecciona un color válido en formato hexadecimal.' }, { status: 400 });
  }

  const current = await getActiveConfig();
  if (!current) {
    return NextResponse.json({ error: 'Primero guarda el perfil fiscal de la empresa.' }, { status: 400 });
  }

  const saved = await prisma.configuracionFiscal.update({
    where: { id: current.id },
    data: { aparienciaHeaderColor },
  });

  return NextResponse.json({ ok: true, config: publicConfig(saved) });
}
