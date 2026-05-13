import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSatCredentialsAsBinary } from '@/lib/sat/session-store';
import { getFielCredentialsAsBinary } from '@/lib/configuracion';
import { ensurePerfilDescargaSat } from '@/lib/sat/perfiles';
import { expedienteTipoLabel, normalizarExpedientePerfil, normalizarExpedienteTipo } from '@/lib/expediente-fiscal/catalogos';
import { ensureExpedienteFiscalSchema } from '@/lib/expediente-fiscal/schema';
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
  correoDestino?: string;
  errorCorreo?: string;
  verificadoAt?: string;
};

function metadataOf(value: Prisma.JsonValue | null | undefined): SolicitudMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SolicitudMetadata;
}

function sessionRfcNombre(session: unknown) {
  if (!session || typeof session !== 'object') return '';
  const value = (session as { rfcNombre?: unknown }).rfcNombre;
  return typeof value === 'string' ? value : '';
}

export async function GET(req?: NextRequest) {
  try {
    await ensureExpedienteFiscalSchema();
    const perfilParam = req?.nextUrl.searchParams.get('perfil');
    const perfilFiltro = perfilParam
      ? await ensurePerfilDescargaSat(normalizarExpedientePerfil(perfilParam))
      : null;

    const pendientes = await prisma.expedienteFiscalSolicitud.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'EN_PROCESO', 'PENDIENTE_DESCARGA_SAT'] },
        ...(perfilFiltro ? { perfilId: perfilFiltro.id } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: { perfil: true },
    });

    if (pendientes.length === 0) {
      return NextResponse.json({ ok: true, mensaje: 'No hay solicitudes de expediente fiscal en proceso.' });
    }

    let pendientesPortal = 0;
    let enProceso = 0;
    let completadas = 0;
    let errores = 0;

    for (const solicitud of pendientes) {
      const perfilClave = solicitud.perfil?.clave || 'principal';
      const perfil = solicitud.perfil || await ensurePerfilDescargaSat(perfilClave);
      const satSession = getSatCredentialsAsBinary(perfilClave) || (perfilClave === 'principal' ? await getFielCredentialsAsBinary() : null);

      if (!satSession) {
        await prisma.expedienteFiscalSolicitud.update({
          where: { id: solicitud.id },
          data: {
            estado: 'EN_PROCESO',
            mensaje: 'Solicitud en proceso. Conecta la e.firma de este perfil para continuar la verificación SAT.',
          },
        });
        enProceso++;
        continue;
      }

      const metadata = metadataOf(solicitud.metadata);
      const tipo = normalizarExpedienteTipo(solicitud.tipo);
      const tipoLabel = expedienteTipoLabel(tipo);

      if (tipo === 'CIF') {
        try {
          const cif = await crearCifVerificada({
            perfilClave,
            requestId: solicitud.requestId,
            satCreds: satSession,
            perfilRfc: perfil.rfc,
            perfilRfcNombre: perfil.rfcNombre,
          });

          await prisma.expedienteFiscalSolicitud.update({
            where: { id: solicitud.id },
            data: {
              estado: 'COMPLETADA',
              mensaje: cif.mensaje,
              metadata: {
                ...metadata,
                fecha: null,
                requiereFecha: false,
                ...cif.metadata,
              },
            },
          });

          completadas++;
        } catch (error) {
          await prisma.expedienteFiscalSolicitud.update({
            where: { id: solicitud.id },
            data: {
              estado: 'ERROR',
              mensaje: error instanceof Error ? error.message : 'No fue posible verificar la CIF con la e.firma.',
            },
          });
          errores++;
        }

        continue;
      }

      const mensaje =
        `${tipoLabel} no se marco como descargada porque el sistema no recibio un PDF real del SAT. ` +
        `Token: ${solicitud.requestId}. RFC validado: ${satSession.rfc || perfil.rfc || ''}.`;

      await prisma.expedienteFiscalSolicitud.update({
        where: { id: solicitud.id },
        data: {
          estado: 'PENDIENTE_DESCARGA_SAT',
          mensaje,
          metadata: {
            ...metadata,
            satRfc: satSession.rfc || perfil.rfc || '',
            satRfcNombre: sessionRfcNombre(satSession) || perfil.rfcNombre || '',
            archivoPath: null,
            archivoNombre: null,
            archivoOrigen: null,
          },
        },
      });

      pendientesPortal++;
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Verificación terminada. COMPLETADA: ${completadas} | PENDIENTE_DESCARGA_SAT: ${pendientesPortal} | EN_PROCESO: ${enProceso} | ERROR: ${errores}`,
    });
  } catch (error: unknown) {
    console.error('Error verificando expediente fiscal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error verificando expediente fiscal.' },
      { status: 500 }
    );
  }
}
