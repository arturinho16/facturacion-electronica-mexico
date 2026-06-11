import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensurePerfilDescargaSat, normalizarPerfilClave } from '@/lib/sat/perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const perfilClave = normalizarPerfilClave(searchParams.get('perfil'));
        const perfil = await ensurePerfilDescargaSat(perfilClave);
        const solicitudes = await prisma.solicitudSat.findMany({
            where: {
                OR: [
                    { perfilId: perfil.id },
                    ...(perfilClave === 'principal' ? [{ perfilId: null }] : []),
                ],
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                requestId: true,
                fechaInicio: true,
                fechaFin: true,
                estado: true,
                mensajeSat: true,
                createdAt: true,
            },
        });

        return NextResponse.json(solicitudes);
    } catch (error: unknown) {
        console.error('Error obteniendo historial SAT:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Error obteniendo historial SAT.' },
            { status: 500 }
        );
    }
}
