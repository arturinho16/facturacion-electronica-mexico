import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
    const hashedPassword = await bcrypt.hash("admin123", 12);

    await prisma.usuario.upsert({
        where: { email: "admin@tufisti.com" },
        update: {
            rol: "SUPERADMIN",
            modulos: {
                dashboard: true,
                nomina: true,
                facturacion: true,
                factura_global: true,
                clientes: true,
                productos: true,
                cotizaciones: true,
                configuracion: true,
                descargas_sat: true
            }
        },
        create: {
            nombre: "Súper Administrador",
            email: "admin@tufisti.com",
            password: hashedPassword,
            rol: "SUPERADMIN",
            modulos: {
                dashboard: true,
                nomina: true,
                facturacion: true,
                factura_global: true,
                clientes: true,
                productos: true,
                cotizaciones: true,
                configuracion: true,
                descargas_sat: true
            }
        }
    });

    console.log("✔ Súper Administrador asegurado en la base de datos");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });