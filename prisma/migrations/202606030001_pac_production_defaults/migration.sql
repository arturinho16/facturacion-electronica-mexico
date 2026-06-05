ALTER TABLE "ConfiguracionFiscal"
  ALTER COLUMN "pacAmbiente" SET DEFAULT 'prod';

ALTER TABLE "RegistroTimbrado"
  ALTER COLUMN "ambiente" SET DEFAULT 'prod';
