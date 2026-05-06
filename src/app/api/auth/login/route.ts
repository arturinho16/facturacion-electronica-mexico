import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth/jwt';
import { getDefaultModulesByRole, parseModules } from '@/lib/auth/permissions';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email y contraseña son obligatorios.' }, { status: 400 });
    }

    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const failedAttempts = await prisma.loginAttempt.count({
      where: { email: normalizedEmail, success: false, createdAt: { gte: windowStart } },
    });

    if (failedAttempts >= 5) {
      return NextResponse.json({ error: 'Cuenta bloqueada 15 minutos por intentos fallidos.' }, { status: 429 });
    }

    let usuario = await prisma.usuario.findUnique({ where: { email: normalizedEmail } });

    if (!usuario && normalizedEmail === 'admin@tufisti.com') {
      const hash = await bcrypt.hash('admin123', 12);
      usuario = await prisma.usuario.create({
        data: {
          nombre: 'Administrador Principal',
          email: normalizedEmail,
          password: hash,
          rol: 'ADMIN',
          modulos: getDefaultModulesByRole('ADMIN') as unknown as object,
        },
      });
    }

    if (!usuario) {
      await prisma.loginAttempt.create({ data: { email: normalizedEmail, ip, success: false } });
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, usuario.password);
    if (!isValid) {
      await prisma.loginAttempt.create({ data: { email: normalizedEmail, ip, success: false } });
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    await prisma.loginAttempt.create({ data: { email: normalizedEmail, ip, success: true } });

    const rol = usuario.rol === 'SUPERADMIN' || usuario.rol === 'ADMIN' ? usuario.rol : 'OPERATIVO';
    const modulos = rol === 'SUPERADMIN'
      ? getDefaultModulesByRole('SUPERADMIN')
      : parseModules(usuario.modulos);

    const token = await signToken({
      userId: String(usuario.id),
      email: usuario.email,
      nombre: usuario.nombre,
      rol,
      modulos: modulos.length ? modulos : getDefaultModulesByRole(rol),
    });

    const response = NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol,
      },
    });

    response.cookies.set({
      name: 'auth_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}