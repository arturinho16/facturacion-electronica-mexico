import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { getSatCredentialsAsBinary, getSatSession } from '@/lib/sat/session-store';
import { getFielCredentialsAsBinary } from '@/lib/configuracion';
import { ensurePerfilDescargaSat } from '@/lib/sat/perfiles';
import {
  expedienteTipoLabel,
  normalizarExpedientePerfil,
  normalizarExpedienteTipo,
} from '@/lib/expediente-fiscal/catalogos';
import { ensureExpedienteFiscalSchema } from '@/lib/expediente-fiscal/schema';
import { startExpedienteFiscalCron } from '@/lib/expediente-fiscal/cron';
import { crearCifVerificada } from '@/lib/expediente-fiscal/cif';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SolicitudMetadata = {
  fecha?: string | null;
  requiereFecha?: boolean;
  satRfc?: string;
  satRfcNombre?: string;
  archivoPath?: string;
  archivoNombre?: string;
  archivoOrigen?: string;
  archivoMime?: string;
  archivoSize?: number;
  archivoHash?: string;
  verificadoAt?: string;
};

function metadataOf(value: Prisma.JsonValue | null | undefined): SolicitudMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SolicitudMetadata;
}

function serializeSolicitud(solicitud: {
  id: string;
  requestId: string;
  tipo: string;
  estado: string;
  mensaje: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  const metadata = metadataOf(solicitud.metadata);
  return {
    id: solicitud.id,
    requestId: solicitud.requestId,
    tipo: normalizarExpedienteTipo(solicitud.tipo),
    tipoLabel: expedienteTipoLabel(solicitud.tipo),
    fecha: metadata.fecha || null,
    estado: solicitud.estado,
    mensaje: solicitud.mensaje || 'Consulta registrada.',
    archivoDisponible: Boolean(metadata.archivoPath),
    createdAt: solicitud.createdAt.toISOString(),
  };
}

function generarTokenExpediente() {
  return `EXP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const perfilClave = normalizarExpedientePerfil(req.nextUrl.searchParams.get('perfil'));
    const perfil = await ensurePerfilDescargaSat(perfilClave);
    await ensureExpedienteFiscalSchema();

    const solicitudes = await prisma.expedienteFiscalSolicitud.findMany({
      where: { perfilId: perfil.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return NextResponse.json({ solicitudes: solicitudes.map(serializeSolicitud) });
  } catch (error: unknown) {
    console.error('Error obteniendo consultas de expediente fiscal:', error);
    return NextResponse.json({ solicitudes: [] });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const body = await req.json();
    const perfilClave = normalizarExpedientePerfil(body?.perfil);
    const tipo = normalizarExpedienteTipo(body?.tipo);
    const fecha = typeof body?.fecha === 'string' ? body.fecha.trim() : '';
    const requiereFecha = tipo !== 'CIF';
    const session = getSatSession(perfilClave);

    if (!session) {
      return NextResponse.json(
        { error: 'No hay una sesión SAT activa. Primero conecta la e.firma del RFC.' },
        { status: 400 }
      );
    }

    if (requiereFecha && !fecha) {
      return NextResponse.json(
        { error: 'Selecciona la fecha que quieres consultar en SAT.' },
        { status: 400 }
      );
    }

    const perfil = await ensurePerfilDescargaSat(perfilClave);
    await ensureExpedienteFiscalSchema();

    const tipoLabel = expedienteTipoLabel(tipo);
    const requestId = generarTokenExpediente();
    const mensaje =
      tipo === 'CIF'
        ? `Solicitud registrada para verificación SAT. Token de seguimiento: ${requestId}.`
        : `Solicitud registrada para ${tipoLabel} del ${fecha}. Token de seguimiento: ${requestId}.`;

    if (tipo === 'CIF') {
      const pendienteCif = await prisma.expedienteFiscalSolicitud.findFirst({
        where: {
          perfilId: perfil.id,
          tipo: 'CIF',
          estado: { in: ['PENDIENTE', 'EN_PROCESO', 'PENDIENTE_DESCARGA_SAT'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (pendienteCif) {
        const satCreds = getSatCredentialsAsBinary(perfilClave) || (perfilClave === 'principal' ? await getFielCredentialsAsBinary() : null);

        if (!satCreds) {
          const updated = await prisma.expedienteFiscalSolicitud.update({
            where: { id: pendienteCif.id },
            data: {
              estado: 'EN_PROCESO',
              mensaje: 'Solicitud CIF registrada. Conecta la e.firma de este perfil para completar la verificación SAT.',
            },
          });

          startExpedienteFiscalCron();

          return NextResponse.json({
            ok: true,
            requestId: updated.requestId,
            mensaje: updated.mensaje,
            solicitud: serializeSolicitud(updated),
          });
        }

        const cif = await crearCifVerificada({
          perfilClave,
          requestId: pendienteCif.requestId,
          satCreds,
          perfilRfc: perfil.rfc,
          perfilRfcNombre: perfil.rfcNombre,
        });

        const updated = await prisma.expedienteFiscalSolicitud.update({
          where: { id: pendienteCif.id },
          data: {
            estado: 'COMPLETADA',
            mensaje: cif.mensaje,
            metadata: {
              fecha: null,
              requiereFecha,
              ...cif.metadata,
            },
          },
        });

        return NextResponse.json({
          ok: true,
          requestId: updated.requestId,
          mensaje: cif.mensaje,
          solicitud: serializeSolicitud(updated),
        });
      }
    }

    const solicitud = await prisma.expedienteFiscalSolicitud.create({
      data: {
        requestId,
        perfilId: perfil.id,
        tipo,
        estado: tipo === 'CIF' ? 'EN_PROCESO' : 'PENDIENTE',
        mensaje,
        metadata: {
          fecha: requiereFecha ? fecha : null,
          requiereFecha,
          satRfc: session.rfc,
          satRfcNombre: session.rfcNombre || '',
        },
      },
    });

    if (tipo === 'CIF') {
      const satCreds = getSatCredentialsAsBinary(perfilClave) || (perfilClave === 'principal' ? await getFielCredentialsAsBinary() : null);

      if (!satCreds) {
        const updated = await prisma.expedienteFiscalSolicitud.update({
          where: { id: solicitud.id },
          data: {
            estado: 'EN_PROCESO',
            mensaje: 'Solicitud CIF registrada. Conecta la e.firma de este perfil para completar la verificación SAT.',
          },
        });

        startExpedienteFiscalCron();

        return NextResponse.json({
          ok: true,
          requestId,
          mensaje: updated.mensaje,
          solicitud: serializeSolicitud(updated),
        });
      }

      const cif = await crearCifVerificada({
        perfilClave,
        requestId,
        satCreds,
        perfilRfc: perfil.rfc,
        perfilRfcNombre: perfil.rfcNombre,
      });

      const updated = await prisma.expedienteFiscalSolicitud.update({
        where: { id: solicitud.id },
        data: {
          estado: 'COMPLETADA',
          mensaje: cif.mensaje,
          metadata: {
            fecha: null,
            requiereFecha,
            ...cif.metadata,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        requestId,
        mensaje: cif.mensaje,
        solicitud: serializeSolicitud(updated),
      });
    }

    startExpedienteFiscalCron();

    return NextResponse.json({
      ok: true,
      requestId,
      mensaje,
      solicitud: serializeSolicitud(solicitud),
    });
  } catch (error: unknown) {
    console.error('Error consultando expediente fiscal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible consultar el expediente fiscal.' },
      { status: 500 }
    );
  }
}
