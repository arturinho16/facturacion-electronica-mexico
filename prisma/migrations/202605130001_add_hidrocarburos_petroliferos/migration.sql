ALTER TABLE "ConfiguracionFiscal"
  ADD COLUMN IF NOT EXISTS "hypEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hypTipoPermiso" TEXT,
  ADD COLUMN IF NOT EXISTS "hypNumeroPermiso" TEXT;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "requiresHypComplement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hypClave" TEXT,
  ADD COLUMN IF NOT EXISTS "hypSubproducto" TEXT;

ALTER TABLE "ConceptoFactura"
  ADD COLUMN IF NOT EXISTS "requiresHypComplement" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hypClave" TEXT,
  ADD COLUMN IF NOT EXISTS "hypSubproducto" TEXT,
  ADD COLUMN IF NOT EXISTS "hypTipoPermiso" TEXT,
  ADD COLUMN IF NOT EXISTS "hypNumeroPermiso" TEXT;

UPDATE "Product"
SET
  "requiresHypComplement" = true,
  "claveUnidad" = 'LTR',
  "unidad" = 'Litro',
  "hypClave" = COALESCE("hypClave", "claveProdServ")
WHERE "claveProdServ" IN ('15101505', '15101514', '15101515');
