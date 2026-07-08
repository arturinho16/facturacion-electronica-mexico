import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = cleanText(searchParams.get('q'));
    const take = Math.min(Number(searchParams.get('take')) || 12, 25);

    if (q.length < 2) return NextResponse.json([]);

    const isNumeric = /^\d+$/.test(q);
    const items = await prisma.catalogoSatProductoServicio.findMany({
      where: {
        activo: true,
        OR: isNumeric
          ? [
            { claveSat: { startsWith: q, mode: 'insensitive' } },
            { claveSat: { contains: q, mode: 'insensitive' } },
          ]
          : [
            { descripcionSat: { contains: q, mode: 'insensitive' } },
            { categoria: { contains: q, mode: 'insensitive' } },
            { subcategoria: { contains: q, mode: 'insensitive' } },
            { claveSat: { contains: q, mode: 'insensitive' } },
          ],
      },
      orderBy: [{ claveSat: 'asc' }],
      take,
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
