CREATE TABLE "CatalogoSatProductoServicio" (
  "id" TEXT NOT NULL,
  "claveSat" TEXT NOT NULL,
  "descripcionSat" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "subcategoria" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "origen" TEXT,
  "esUsuario" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CatalogoSatProductoServicio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogoSatProductoServicio_claveSat_key" ON "CatalogoSatProductoServicio"("claveSat");
CREATE INDEX "CatalogoSatProductoServicio_claveSat_idx" ON "CatalogoSatProductoServicio"("claveSat");
CREATE INDEX "CatalogoSatProductoServicio_descripcionSat_idx" ON "CatalogoSatProductoServicio"("descripcionSat");
CREATE INDEX "CatalogoSatProductoServicio_categoria_idx" ON "CatalogoSatProductoServicio"("categoria");
CREATE INDEX "CatalogoSatProductoServicio_subcategoria_idx" ON "CatalogoSatProductoServicio"("subcategoria");
