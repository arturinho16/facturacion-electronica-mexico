import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizarObjetoImp } from '@/lib/sat/timbrar';
import { normalizeHidrocarburosProductInput } from '@/modules/cfdi-complements/hidrocarburos';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(
      products.map((product) => ({
        ...product,
        objetoImpuesto: normalizarObjetoImp(product.objetoImpuesto),
      }))
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const hyp = normalizeHidrocarburosProductInput(data);

    // 1. Crear el producto (Con los cast a Number requeridos por Prisma)
    const product = await prisma.product.create({
      data: {
        numeroInterno: data.numeroInterno || null,
        nombre: data.nombre,
        codigoInterno: data.codigoInterno || null,
        descripcion: data.descripcion || data.nombre, // Fallback obligatorio
        precio: Number(data.precio),                  // Cast a Número
        ivaTasa: Number(data.ivaTasa),                // Cast a Número
        iepsTasa: Number(data.iepsTasa || 0),         // Cast a Número
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

    // 2. Lógica de aprendizaje: Guardar nuevas claves SAT
    if (data.claveProdServ) {
      await prisma.satClaveProdServ.upsert({
        where: { clave: data.claveProdServ },
        update: {},
        create: {
          clave: data.claveProdServ,
          descripcion: data.nombreProdServ || data.nombre, // Usamos la descripción del SAT
        }
      });
    }

    if (data.claveUnidad && data.unidad) {
      await prisma.satClaveUnidad.upsert({
        where: { clave: data.claveUnidad },
        update: {},
        create: {
          clave: data.claveUnidad,
          nombre: data.unidad,
        }
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Error al guardar producto:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
