import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/session-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isInteger(userId)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const body = await req.json();
    const newPassword = String(body?.newPassword || '');

    if (newPassword.length < 8) {
        return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.usuario.update({ where: { id: userId }, data: { password: hash } });

    return NextResponse.json({ ok: true, message: 'Contraseña restablecida correctamente.' });
}
