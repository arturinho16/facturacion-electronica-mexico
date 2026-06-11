import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { getDefaultModulesByRole } from '../src/lib/auth/permissions';

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
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
