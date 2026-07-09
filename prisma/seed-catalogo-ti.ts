import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../src/lib/prisma';

type CatalogoSatTiJsonItem = {
  categoria?: string;
  subcategoria?: string;
  clave_sat?: string;
  descripcion_sat?: string;
  tipo?: string;
  activo?: string | boolean;
  origen?: string;
};

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  return String(value || '').trim().toLowerCase() === 'true';
}

async function main() {
  const filePath = path.join(process.cwd(), 'prisma', 'data', 'catalogo-sat-ti.json');

  console.log('Leyendo archivo:', filePath);

  const raw = await readFile(filePath, 'utf8');
  const items = JSON.parse(raw) as CatalogoSatTiJsonItem[];

  let total = 0;
  let omitidos = 0;

  for (const item of items) {
    const claveSat = String(item.clave_sat || '').trim();
    const descripcionSat = String(item.descripcion_sat || '').trim();

    if (!/^\d{8}$/.test(claveSat) || !descripcionSat) {
      omitidos += 1;
      continue;
    }

    await prisma.catalogoSatProductoServicio.upsert({
      where: { claveSat },
      update: {
        descripcionSat,
        categoria: String(item.categoria || 'Sin categoría').trim(),
        subcategoria: String(item.subcategoria || 'Sin subcategoría').trim(),
        tipo: String(item.tipo || 'Producto').trim(),
        activo: toBoolean(item.activo),
        origen: item.origen || 'SAT c_ClaveProdServ filtrado TI',
        esUsuario: false,
      },
      create: {
        claveSat,
        descripcionSat,
        categoria: String(item.categoria || 'Sin categoría').trim(),
        subcategoria: String(item.subcategoria || 'Sin subcategoría').trim(),
        tipo: String(item.tipo || 'Producto').trim(),
        activo: toBoolean(item.activo),
        origen: item.origen || 'SAT c_ClaveProdServ filtrado TI',
        esUsuario: false,
      },
    });

    total += 1;
  }

  console.log('Catálogo SAT TI aplicado correctamente.');
  console.log(`Registros insertados/actualizados: ${total}`);
  console.log(`Registros omitidos por datos inválidos: ${omitidos}`);
}

main()
  .catch((error) => {
    console.error('Error al aplicar catálogo SAT TI:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
