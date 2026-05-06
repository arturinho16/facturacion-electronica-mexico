import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth/session-server';
import { getDefaultModulesByRole, parseModules } from '@/lib/auth/permissions';

export async function GET() {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    try {
        const usuarios = await prisma.usuario.findMany({
            where: { rol: { not: 'SUPERADMIN' } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, nombre: true, email: true, rol: true, modulos: true, createdAt: true, updatedAt: true },
        });
        return NextResponse.json({ usuarios: usuarios.map((usuario) => ({ ...usuario, rol: usuario.rol === 'USER' ? 'OPERATIVO' : usuario.rol, modulos: parseModules(usuario.modulos) })) });
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    try {
        const body = await req.json();
        const nombre = String(body.nombre || '').trim();
        const email = String(body.email || '').toLowerCase().trim();
        const password = String(body.password || '');
        const rol = body.rol === 'ADMIN' ? 'ADMIN' : 'OPERATIVO';

        if (!nombre || !email || password.length < 8) {
            return NextResponse.json({ error: 'Nombre, correo y contraseña de al menos 8 caracteres son obligatorios.' }, { status: 400 });
        }

        const existe = await prisma.usuario.findUnique({ where: { email } });
        if (existe) return NextResponse.json({ error: 'El correo ya está registrado' }, { status: 400 });

        const hashedPassword = await bcrypt.hash(password, 12);
        const modulos = rol === 'ADMIN' ? getDefaultModulesByRole('ADMIN') : parseModules(body.modulos);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                nombre,
                email,
                password: hashedPassword,
                rol,
                modulos: modulos as unknown as object,
            },
            select: { id: true, nombre: true, email: true, rol: true, modulos: true, createdAt: true, updatedAt: true },
        });
        return NextResponse.json({ ok: true, usuario: nuevoUsuario });
    } catch (error) {
        return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const guard = await requireAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    try {
        const body = await req.json();
        const id = Number(body.id);
        if (!Number.isInteger(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

        const rol = body.rol === 'ADMIN' ? 'ADMIN' : 'OPERATIVO';
        const dataToUpdate = {
            nombre: String(body.nombre || '').trim(),
            rol,
            modulos: (rol === 'ADMIN' ? getDefaultModulesByRole('ADMIN') : parseModules(body.modulos)) as unknown as object,
        };

        const usuarioActualizado = await prisma.usuario.update({
            where: { id },
            data: dataToUpdate,
            select: { id: true, nombre: true, email: true, rol: true, modulos: true },
        });
        return NextResponse.json({ ok: true, usuario: usuarioActualizado });
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
    }
}
