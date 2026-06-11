import { readFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { ensureExpedienteFiscalSchema } from '@/lib/expediente-fiscal/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SolicitudMetadata = {
  archivoPath?: string;
  archivoNombre?: string;
  archivoOrigen?: string;
  archivoMime?: string;
};

function metadataOf(value: Prisma.JsonValue | null | undefined): SolicitudMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SolicitudMetadata;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireModule('expediente_fiscal');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  await ensureExpedienteFiscalSchema();

  const { id } = await params;
  const solicitud = await prisma.expedienteFiscalSolicitud.findUnique({ where: { id } });
  const metadata = metadataOf(solicitud?.metadata);

  if (!solicitud || solicitud.estado !== 'COMPLETADA' || !metadata.archivoPath) {
    return NextResponse.json({ error: 'El archivo del expediente fiscal todavia no esta disponible para descarga.' }, { status: 404 });
  }

  const absolutePath = path.join(/*turbopackIgnore: true*/ process.cwd(), metadata.archivoPath);
  const buffer = await readFile(absolutePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      ...(metadata.archivoMime ? { 'Content-Type': metadata.archivoMime } : {}),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(metadata.archivoNombre || 'expediente-fiscal.pdf')}"`,
    },
  });
}
