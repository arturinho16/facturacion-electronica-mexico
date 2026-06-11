import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session-server';
import { getDefaultModulesByRole, parseModules } from '@/lib/auth/permissions';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const body = await req.json();

    const updated = await prisma.usuario.update({
        where: { id: userId },
        data: {
            nombre: String(body?.nombre || '').trim(),
            rol: body?.rol === 'ADMIN' ? 'ADMIN' : 'OPERATIVO',
            modulos: (body?.rol === 'ADMIN' ? getDefaultModulesByRole('ADMIN') : parseModules(body?.modulos)) as unknown as object,
        },
    });

    return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    if (String(guard.session.userId) === String(userId)) {
        return NextResponse.json({ error: 'No puedes eliminar tu propio usuario.' }, { status: 400 });
    }

    await prisma.usuario.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
}
