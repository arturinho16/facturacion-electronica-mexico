import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizarObjetoImp } from '@/lib/sat/timbrar';
import { normalizeHidrocarburosProductInput } from '@/modules/cfdi-complements/hidrocarburos';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const hyp = normalizeHidrocarburosProductInput(data);

    const product = await prisma.product.update({
      where: { id },
      data: {
        numeroInterno: data.numeroInterno || null,
        nombre: data.nombre,
        codigoInterno: data.codigoInterno || null,
        descripcion: data.descripcion || data.nombre,
        precio: Number(data.precio),
        ivaTasa: Number(data.ivaTasa),
        iepsTasa: Number(data.iepsTasa || 0),
        claveProdServ: data.claveProdServ,
        claveUnidad: hyp.claveUnidad,
        unidad: hyp.unidad,
        objetoImpuesto: normalizarObjetoImp(data.objetoImpuesto),
        cuentaPredial: data.cuentaPredial || null,
        numeroPedimento: data.numeroPedimento || null,
        impuestoLocal: data.impuestoLocal ? Number(data.impuestoLocal) : null,
        requiresHypComplement: hyp.requiresHypComplement,
        hypClave: hyp.hypClave,
        hypSubproducto: hyp.hypSubproducto,
      },
    });

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
