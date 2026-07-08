import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const TIPOS_VALIDOS = new Set(['Producto', 'Servicio']);

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalizeTipo(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return 'Producto';
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return TIPOS_VALIDOS.has(normalized) ? normalized : raw;
}

function validatePayload(data: Record<string, unknown>) {
  const claveSat = cleanText(data.claveSat);
  const descripcionSat = cleanText(data.descripcionSat);
  const categoria = cleanText(data.categoria);
  const subcategoria = cleanText(data.subcategoria);
  const tipo = normalizeTipo(data.tipo);

  if (!/^\d{8}$/.test(claveSat)) {
    return { error: 'La clave SAT debe tener exactamente 8 dígitos.' };
  }

  if (!descripcionSat || !categoria || !subcategoria) {
    return { error: 'Descripción, categoría y subcategoría son obligatorias.' };
  }

  if (!TIPOS_VALIDOS.has(tipo)) {
    return { error: 'El tipo debe ser Producto o Servicio.' };
  }

  return {
    data: {
      claveSat,
      descripcionSat,
      categoria,
      subcategoria,
      tipo,
      activo: typeof data.activo === 'boolean' ? data.activo : true,
      origen: cleanText(data.origen) || 'Captura manual',
    },
  };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = validatePayload(body);

    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const item = await prisma.catalogoSatProductoServicio.update({
      where: { id },
      data: validated.data,
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Esa clave SAT ya existe en el catálogo.' }, { status: 409 });
      }

      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Clave SAT no encontrada.' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.catalogoSatProductoServicio.update({
      where: { id },
      data: { activo: false },
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Clave SAT no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
