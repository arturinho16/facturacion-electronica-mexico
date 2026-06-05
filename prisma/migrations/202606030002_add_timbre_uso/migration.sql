CREATE TABLE "TimbreUso" (
  "id" TEXT NOT NULL,
  "uuid" TEXT NOT NULL,
  "tipoCfdi" TEXT NOT NULL,
  "facturaId" TEXT,
  "reciboNominaId" TEXT,
  "configuracionFiscalId" TEXT,
  "emisorRfc" TEXT NOT NULL,
  "emisorNombre" TEXT,
  "receptorRfc" TEXT,
  "receptorNombre" TEXT,
  "serie" TEXT,
  "folio" TEXT,
  "total" DECIMAL(15,2),
  "pac" TEXT NOT NULL DEFAULT 'FINKOK',
  "ambiente" TEXT NOT NULL DEFAULT 'prod',
  "fechaTimbrado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TimbreUso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimbreUso_uuid_key" ON "TimbreUso"("uuid");
CREATE INDEX "TimbreUso_fechaTimbrado_idx" ON "TimbreUso"("fechaTimbrado");
CREATE INDEX "TimbreUso_tipoCfdi_idx" ON "TimbreUso"("tipoCfdi");
CREATE INDEX "TimbreUso_emisorRfc_idx" ON "TimbreUso"("emisorRfc");
CREATE INDEX "TimbreUso_receptorRfc_idx" ON "TimbreUso"("receptorRfc");

INSERT INTO "TimbreUso" (
  "id",
  "uuid",
  "tipoCfdi",
  "facturaId",
  "configuracionFiscalId",
  "emisorRfc",
  "emisorNombre",
  "receptorRfc",
  "receptorNombre",
  "serie",
  "folio",
  "total",
  "pac",
  "ambiente",
  "fechaTimbrado",
  "createdAt"
)
SELECT
  CONCAT('factura-', f."id"),
  UPPER(f."uuid"),
  'FACTURA',
  f."id",
  c."id",
  c."rfc",
  c."razonSocial",
  cl."rfc",
  cl."nombreRazonSocial",
  f."serie",
  f."folio",
  f."total",
  COALESCE(c."pacProveedor", 'FINKOK'),
  COALESCE(c."pacAmbiente", 'prod'),
  COALESCE(f."updatedAt", f."createdAt"),
  NOW()
FROM "Factura" f
JOIN "Client" cl ON cl."id" = f."clientId"
LEFT JOIN LATERAL (
  SELECT *
  FROM "ConfiguracionFiscal"
  WHERE "activo" = true
  ORDER BY "updatedAt" DESC
  LIMIT 1
) c ON true
WHERE f."estado" = 'TIMBRADO'
  AND f."uuid" IS NOT NULL
ON CONFLICT ("uuid") DO NOTHING;

INSERT INTO "TimbreUso" (
  "id",
  "uuid",
  "tipoCfdi",
  "reciboNominaId",
  "configuracionFiscalId",
  "emisorRfc",
  "emisorNombre",
  "receptorRfc",
  "receptorNombre",
  "serie",
  "folio",
  "total",
  "pac",
  "ambiente",
  "fechaTimbrado",
  "createdAt"
)
SELECT
  CONCAT('nomina-', r."id"),
  UPPER(r."uuid"),
  'NOMINA',
  r."id",
  c."id",
  c."rfc",
  c."razonSocial",
  e."rfc",
  TRIM(CONCAT(e."nombre", ' ', e."apellidoPaterno", ' ', COALESCE(e."apellidoMaterno", ''))),
  COALESCE(c."folioNominaSerie", 'NOM'),
  SUBSTRING(r."id", 1, 10),
  r."totalNeto",
  COALESCE(c."pacProveedor", 'FINKOK'),
  COALESCE(c."pacAmbiente", 'prod'),
  COALESCE(r."updatedAt", r."createdAt"),
  NOW()
FROM "ReciboNomina" r
JOIN "Empleado" e ON e."id" = r."empleadoId"
LEFT JOIN LATERAL (
  SELECT *
  FROM "ConfiguracionFiscal"
  WHERE "activo" = true
  ORDER BY "updatedAt" DESC
  LIMIT 1
) c ON true
WHERE r."estado" = 'TIMBRADO'
  AND r."uuid" IS NOT NULL
ON CONFLICT ("uuid") DO NOTHING;
