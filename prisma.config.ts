import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Forzamos la lectura del .env en la raíz
dotenv.config();

// Hacemos que el código "grite" si la variable no se cargó
if (!process.env.DATABASE_URL) {
  console.error("❌ ALERTA: dotenv no está logrando leer DATABASE_URL del archivo .env");
  process.exit(1);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
