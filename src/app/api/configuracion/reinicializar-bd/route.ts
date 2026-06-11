import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth/session-server';

// 1. Verificación de Roles
function isAdminRole(rol: unknown) {
  const normalized = String(rol || '').replace(/[\s_-]/g, '').toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SUPERADMIN';
}

// 2. Obtener al admin autenticado
async function getAuthenticatedAdmin(session: any) {
  const email = String(session.email || '').toLowerCase().trim();
  const sessionUserId = Number(session.userId);

  // Buscar en la tabla principal (Usuario)
  if (Number.isInteger(sessionUserId)) {
    const usuario = await prisma.usuario.findUnique({ where: { id: sessionUserId } });
    if (usuario) return { email: usuario.email, password: usuario.password, rol: usuario.rol };
  }

  // Buscar en la tabla secundaria/legacy (User)
  const legacyUserId = String(session.userId || '').trim();
  const legacyUser = await prisma.user.findFirst({
    where: { OR: [{ id: legacyUserId }, { email }] },
  });

  if (legacyUser) return { email: legacyUser.email, password: legacyUser.password, rol: legacyUser.rol };

  return null;
}

// 3. Método POST principal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión primero.' }, { status: 401 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Confirma tu contraseña para reinicializar la base de datos.' }, { status: 400 });
    }

    const usuario = await getAuthenticatedAdmin(session);
    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado en la base de datos.' }, { status: 401 });
    }

    if (!isAdminRole(usuario.rol) && !isAdminRole(session.rol)) {
      return NextResponse.json({ error: 'Solo ADMIN o SUPERADMIN puede reinicializar la base de datos.' }, { status: 403 });
    }

    // 🔥 SOLUCIÓN AL CHOQUE DE CONTRASEÑAS: Valida tanto texto plano (desarrollo) como bcrypt (producción)
    const isPlainText = password === usuario.password;
    const isHashed = await bcrypt.compare(password, usuario.password).catch(() => false);

    if (!isPlainText && !isHashed) {
      return NextResponse.json({ error: 'Contraseña incorrecta. Intenta de nuevo.' }, { status: 401 });
    }

    // 🛡️ SOLUCIÓN DE LLAVES FORÁNEAS: Orden estricto de eliminación (De Hijos a Padres)
    await prisma.$transaction(async (tx) => {
      // 1. Módulo de Nóminas
      await tx.registroTimbrado.deleteMany();
      await tx.nominaAprobacion.deleteMany();
      await tx.nominaDeduccion.deleteMany();
      await tx.nominaPercepcion.deleteMany();
      await tx.reciboNomina.deleteMany();
      await tx.empleado.deleteMany();

      // 2. Módulo de Facturas y Cotizaciones (Se deben borrar primero los conceptos)
      await tx.conceptoFactura.deleteMany();
      await tx.conceptoCotizacion.deleteMany();
      await tx.factura.deleteMany();     // Factura se borra antes que la cotización porque depende de ella
      await tx.cotizacion.deleteMany();

      // 3. Catálogos de Clientes y Productos (Se borran hasta que ya no hay facturas que los usen)
      await tx.product.deleteMany();
      await tx.client.deleteMany();

      // 4. Recepción y SAT
      await tx.facturaRecibida.deleteMany();
      await tx.solicitudSat.deleteMany();

      // 5. Configuración General
      await tx.configuracionFiscal.deleteMany();
    });

    return NextResponse.json({ ok: true, message: 'Base de datos reinicializada correctamente. Todo limpio.' });

  } catch (error: any) {
    console.error("Error crítico al resetear la BD:", error);
    // Este catch capturará si falta alguna tabla por borrar en el futuro y te lo dirá en la red.
    return NextResponse.json({
      error: 'Error interno al borrar la base de datos.',
      detalle: error.message
    }, { status: 500 });
  }
}