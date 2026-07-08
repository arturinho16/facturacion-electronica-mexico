import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { getDefaultModulesByRole } from '../src/lib/auth/permissions';

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

async function seedCatalogoSatProductosServicios() {
    const filePath = path.join(process.cwd(), 'prisma', 'data', 'catalogo-sat-ti.json');
    const raw = await readFile(filePath, 'utf8');
    const items = JSON.parse(raw) as CatalogoSatTiJsonItem[];

    let total = 0;

    for (const item of items) {
        const claveSat = String(item.clave_sat || '').trim();
        const descripcionSat = String(item.descripcion_sat || '').trim();

        if (!/^\d{8}$/.test(claveSat) || !descripcionSat) continue;

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

    console.log(`✔ Catálogo SAT productos/servicios asegurado: ${total} claves base`);
}

async function main() {
    const hashedPassword = await bcrypt.hash("admin123", 12);

    await prisma.usuario.upsert({
        where: { email: "admin@tufisti.com" },
        update: {
            rol: "SUPERADMIN",
            modulos: getDefaultModulesByRole('SUPERADMIN')
        },
        create: {
            nombre: "Súper Administrador",
            email: "admin@tufisti.com",
            password: hashedPassword,
            rol: "SUPERADMIN",
            modulos: getDefaultModulesByRole('SUPERADMIN')
        }
    });

    console.log("✔ Súper Administrador asegurado en la base de datos");

    await seedCatalogoSatProductosServicios();
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
