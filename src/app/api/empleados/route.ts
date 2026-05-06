import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeEmpleadoNominaInput, validateEmpleadoNominaInput } from '@/lib/nomina/catalogos';

// ==========================================
// GET: Listar todos los empleados
// ==========================================
export async function GET() {
    try {
        const empleados = await prisma.empleado.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(empleados);
    } catch (error: unknown) {
        console.error("Error obteniendo empleados:", error);
        return NextResponse.json({ error: 'Error al obtener los empleados' }, { status: 500 });
    }
}

// ==========================================
// POST: Crear un nuevo empleado
// ==========================================
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const issues = validateEmpleadoNominaInput(body);
        if (issues.length) {
            return NextResponse.json(
                { error: 'Faltan datos obligatorios para nómina', issues },
                { status: 400 }
            );
        }

        const dataParaGuardar = normalizeEmpleadoNominaInput(body) as Prisma.EmpleadoCreateInput;

        const nuevoEmpleado = await prisma.empleado.create({
            data: dataParaGuardar
        });

        return NextResponse.json(nuevoEmpleado, { status: 201 });

    } catch (error: unknown) {
        console.error("Error creando empleado:", error);

        // P2002 es el código de Prisma cuando se viola una restricción UNIQUE (@unique)
        // En tu schema.prisma tienes @unique en curp, rfc y numEmpleado
        if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
            const target = (error as { meta?: { target?: string[] } }).meta?.target as string[];
            return NextResponse.json(
                { error: `Ya existe un empleado registrado con ese mismo ${target ? target.join(', ') : 'dato único (RFC, CURP o Num Empleado)'}.` },
                { status: 400 }
            );
        }

        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno del servidor' }, { status: 500 });
    }
}

// ==========================================
// DELETE: Eliminar empleados seleccionados
// ==========================================
export async function DELETE(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];

        if (!ids.length) {
            return NextResponse.json({ error: 'Selecciona al menos un empleado para eliminar.' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const recibos = await tx.reciboNomina.findMany({
                where: { empleadoId: { in: ids } },
                select: { id: true },
            });
            const reciboIds = recibos.map((recibo) => recibo.id);

            if (reciboIds.length) {
                await tx.reciboNomina.deleteMany({ where: { id: { in: reciboIds } } });
            }

            const deleted = await tx.empleado.deleteMany({
                where: { id: { in: ids } },
            });

            return { empleadosEliminados: deleted.count, recibosEliminados: reciboIds.length };
        });

        return NextResponse.json({ ok: true, ...result });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error eliminando empleados.' }, { status: 500 });
    }
}
