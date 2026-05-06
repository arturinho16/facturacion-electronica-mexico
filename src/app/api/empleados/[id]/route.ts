import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeEmpleadoNominaInput, validateEmpleadoNominaInput } from '@/lib/nomina/catalogos';

// OBTENER el empleado actual
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // <-- Aquí se desenvuelve la promesa
        const empleado = await prisma.empleado.findUnique({ where: { id } });

        if (!empleado) {
            return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
        }
        return NextResponse.json(empleado);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno del servidor' }, { status: 500 });
    }
}

// ACTUALIZAR el empleado
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // <-- Aquí se desenvuelve la promesa
        const body = await req.json();
        const issues = validateEmpleadoNominaInput(body);
        if (issues.length) {
            return NextResponse.json(
                { error: 'Faltan datos obligatorios para nómina', issues },
                { status: 400 }
            );
        }

        const dataParaActualizar = normalizeEmpleadoNominaInput(body) as Prisma.EmpleadoUpdateInput;

        const empleadoActualizado = await prisma.empleado.update({
            where: { id },
            data: dataParaActualizar
        });

        return NextResponse.json(empleadoActualizado);
    } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2002') {
            return NextResponse.json({ error: 'El RFC, CURP o NumEmpleado choca con otro empleado existente.' }, { status: 400 });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno del servidor' }, { status: 500 });
    }
}

// ELIMINAR empleado
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const result = await prisma.$transaction(async (tx) => {
            const recibos = await tx.reciboNomina.findMany({
                where: { empleadoId: id },
                select: { id: true },
            });
            const reciboIds = recibos.map((recibo) => recibo.id);

            if (reciboIds.length) {
                await tx.reciboNomina.deleteMany({ where: { id: { in: reciboIds } } });
            }

            await tx.empleado.delete({ where: { id } });

            return { empleadosEliminados: 1, recibosEliminados: reciboIds.length };
        });

        return NextResponse.json({ ok: true, ...result });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error eliminando empleado.' }, { status: 500 });
    }
}
