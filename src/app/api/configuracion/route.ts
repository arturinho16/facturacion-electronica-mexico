import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { buildConfigPayload, getActiveConfig, publicConfig } from '@/lib/configuracion';

export async function GET() {
    const guard = await requireModule('configuracion');
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const config = await getActiveConfig();
    return NextResponse.json(publicConfig(config));
}

export async function POST(req: NextRequest) {
    const guard = await requireModule('configuracion');
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const body = await req.json();

    const required = ['rfc', 'razonSocial', 'regimenFiscal', 'codigoPostal'];
    const missing = required.filter((k) => !String(body?.[k] || '').trim());
    if (missing.length) {
        return NextResponse.json({ error: `Faltan campos obligatorios: ${missing.join(', ')}` }, { status: 400 });
    }

    const current = await prisma.configuracionFiscal.findFirst({ where: { activo: true } });

    const payload = buildConfigPayload(body);
    if (current && !body.pacPassword) {
        payload.pacPasswordEncrypted = current.pacPasswordEncrypted;
    }
    if (current && !body.correoPassword) {
        payload.correoPasswordEncrypted = current.correoPasswordEncrypted;
    }

    const saved = current
        ? await prisma.configuracionFiscal.update({ where: { id: current.id }, data: payload })
        : await prisma.configuracionFiscal.create({ data: payload });

    return NextResponse.json({ ok: true, config: publicConfig(saved) });
}
