import { prisma } from '@/lib/prisma';

let schemaReady: Promise<void> | null = null;

export function ensureExpedienteFiscalSchema() {
  schemaReady ??= createSchema();
  return schemaReady;
}

async function createSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExpedienteFiscalSolicitud" (
      "id" TEXT NOT NULL,
      "requestId" TEXT NOT NULL,
      "perfilId" TEXT NOT NULL,
      "tipo" TEXT NOT NULL,
      "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
      "mensaje" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExpedienteFiscalSolicitud_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ExpedienteFiscalSolicitud_requestId_key" UNIQUE ("requestId"),
      CONSTRAINT "ExpedienteFiscalSolicitud_perfilId_fkey"
        FOREIGN KEY ("perfilId") REFERENCES "PerfilDescargaSat"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ExpedienteFiscalSolicitud"
      ADD COLUMN IF NOT EXISTS "requestId" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "ExpedienteFiscalSolicitud"
    SET "requestId" = "id"
    WHERE "requestId" IS NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ExpedienteFiscalSolicitud_requestId_key"
      ON "ExpedienteFiscalSolicitud"("requestId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalSolicitud_perfilId_idx"
      ON "ExpedienteFiscalSolicitud"("perfilId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalSolicitud_tipo_idx"
      ON "ExpedienteFiscalSolicitud"("tipo");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalSolicitud_estado_idx"
      ON "ExpedienteFiscalSolicitud"("estado");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExpedienteFiscalDocumento" (
      "id" TEXT NOT NULL,
      "perfilId" TEXT NOT NULL,
      "tipo" TEXT NOT NULL,
      "titulo" TEXT NOT NULL,
      "estatus" TEXT NOT NULL DEFAULT 'SIN_REVISAR',
      "ejercicio" INTEGER,
      "periodo" TEXT,
      "fechaDocumento" TIMESTAMP(3),
      "fechaVencimiento" TIMESTAMP(3),
      "folio" TEXT,
      "importe" DECIMAL(15,2),
      "moneda" TEXT NOT NULL DEFAULT 'MXN',
      "notas" TEXT,
      "archivoNombre" TEXT,
      "archivoPath" TEXT,
      "archivoMime" TEXT,
      "archivoSize" INTEGER,
      "archivoHash" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExpedienteFiscalDocumento_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ExpedienteFiscalDocumento_perfilId_fkey"
        FOREIGN KEY ("perfilId") REFERENCES "PerfilDescargaSat"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalDocumento_perfilId_idx"
      ON "ExpedienteFiscalDocumento"("perfilId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalDocumento_tipo_idx"
      ON "ExpedienteFiscalDocumento"("tipo");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ExpedienteFiscalDocumento_estatus_idx"
      ON "ExpedienteFiscalDocumento"("estatus");
  `);
}
