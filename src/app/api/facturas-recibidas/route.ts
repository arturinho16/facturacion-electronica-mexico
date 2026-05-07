import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { getSatCredentialsAsBinary } from '@/lib/sat/session-store';
import { getFielCredentialsAsBinary } from '@/lib/configuracion';
import { startFacturasRecibidasCron } from '@/lib/sat/facturas-recibidas-cron';
import { ensurePerfilDescargaSat, normalizarPerfilClave } from '@/lib/sat/perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const perfilClave = normalizarPerfilClave(req.nextUrl.searchParams.get('perfil'));
    const perfil = await ensurePerfilDescargaSat(perfilClave);
    const satCreds = getSatCredentialsAsBinary(perfilClave) || (perfilClave === 'principal' ? await getFielCredentialsAsBinary() : null);
    const receptorRfc = (satCreds?.rfc || perfil.rfc || '').trim().toUpperCase();
    const facturas = await prisma.facturaRecibida.findMany({
      where: {
        AND: [
          {
            OR: [
              { perfilId: perfil.id },
              ...(perfilClave === 'principal' ? [{ perfilId: null }] : []),
            ],
          },
          ...(receptorRfc ? [{ receptorRfc }] : []),
        ],
      },
      orderBy: { fechaEmision: 'asc' },
    });

    return NextResponse.json(facturas);
  } catch (error: unknown) {
    console.error('Error obteniendo facturas recibidas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error obteniendo facturas recibidas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fechaInicio, fechaFin } = body;
    const perfilClave = normalizarPerfilClave(body.perfil || req.nextUrl.searchParams.get('perfil'));
    const perfil = await ensurePerfilDescargaSat(perfilClave);

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Faltan las fechas de inicio y fin.' },
        { status: 400 }
      );
    }

    const satCreds = getSatCredentialsAsBinary(perfilClave) || (perfilClave === 'principal' ? await getFielCredentialsAsBinary() : null);

    if (!satCreds) {
      return NextResponse.json(
        { error: 'No hay una sesión SAT activa. Primero conecta tu e.firma.' },
        { status: 400 }
      );
    }

    const start = new Date(`${fechaInicio}T00:00:00`);
    let end = new Date(`${fechaFin}T23:59:59`);
    const now = new Date();

    if (end > now) {
      end = now;
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'La fecha de inicio no puede ser mayor a la fecha final.' },
        { status: 400 }
      );
    }

    // Solo evitamos duplicados activos
    const solicitudActiva = await prisma.solicitudSat.findFirst({
      where: {
        fechaInicio: start,
        fechaFin: end,
        perfilId: perfil.id,
        estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
      },
    });

    if (solicitudActiva) {
      return NextResponse.json(
        {
          error: `Ese rango exacto ya está en proceso. Token: ${solicitudActiva.requestId}`,
        },
        { status: 400 }
      );
    }

    const satService = new DescargaMasivaSAT(
      satCreds.cerString,
      satCreds.keyString,
      satCreds.password
    );

    const formatToSAT = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const strInicio = formatToSAT(start);
    const strFin = formatToSAT(end);

    const solicitud = await satService.solicitarFacturasRecibidas(
      strInicio,
      strFin,
      'CFDI'
    );

    await prisma.solicitudSat.create({
      data: {
        requestId: solicitud.requestId,
        perfilId: perfil.id,
        fechaInicio: start,
        fechaFin: end,
        estado: 'PENDIENTE',
        mensajeSat: solicitud.mensaje,
      },
    });

    startFacturasRecibidasCron();

    return NextResponse.json({
      ok: true,
      requestId: solicitud.requestId,
      mensaje: `¡Petición XML enviada! El SAT asignó el Token: ${solicitud.requestId}`,
    });
  } catch (error: unknown) {
    console.error('Error en sincronización SAT:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al contactar al SAT' },
      { status: 500 }
    );
  }
}
