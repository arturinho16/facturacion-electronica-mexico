import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizarObjetoImp } from '@/lib/sat/timbrar';
import { normalizeHidrocarburosProductInput } from '@/modules/cfdi-complements/hidrocarburos';

export async function POST(req: NextRequest) {
  try {
    const { csvData } = await req.json();
    
    // Separamos por líneas y limpiamos líneas vacías
    const lines = csvData.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    // Asumimos que la primera línea son los encabezados, la saltamos
    const dataLines = lines.slice(1);
    let guardados = 0;

    for (const line of dataLines) {
      const [
        nombre, codigoInterno, precio, claveProdServ, claveUnidad, unidad, objetoImpuesto, ivaTasa, iepsTasa
      ] = line.split(',');

      if (nombre && precio && claveProdServ) {
        const hyp = normalizeHidrocarburosProductInput({ claveProdServ, claveUnidad, unidad });
        await prisma.product.create({
          data: {
            nombre: nombre.trim(),
            codigoInterno: codigoInterno?.trim() || null,
            descripcion: nombre.trim(),
            precio: Number(precio),
            claveProdServ: claveProdServ.trim(),
            claveUnidad: hyp.claveUnidad,
            unidad: hyp.unidad,
            objetoImpuesto: normalizarObjetoImp(objetoImpuesto),
            ivaTasa: Number(ivaTasa || 0.16),
            iepsTasa: Number(iepsTasa || 0),
            requiresHypComplement: hyp.requiresHypComplement,
            hypClave: hyp.hypClave,
            hypSubproducto: hyp.hypSubproducto,
          }
        });
        guardados++;
      }
    }

    return NextResponse.json({ success: true, count: guardados });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
