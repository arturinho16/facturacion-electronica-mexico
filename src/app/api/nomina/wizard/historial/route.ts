import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';

export async function GET() {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const recibos = await prisma.reciboNomina.findMany({
    include: { empleado: true },
    orderBy: [{ fechaPago: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const grupos = new Map<string, {
    clave: string;
    fechaInicial: string;
    fechaFinal: string;
    fechaPago: string;
    estado: string;
    total: number;
    timbrados: number;
    borradores: number;
    enProceso: number;
    errores: number;
    totalPercepciones: number;
    totalDeducciones: number;
    totalNeto: number;
  }>();

  for (const recibo of recibos) {
    const fechaInicial = recibo.fechaInicialPago.toISOString().slice(0, 10);
    const fechaFinal = recibo.fechaFinalPago.toISOString().slice(0, 10);
    const fechaPago = recibo.fechaPago.toISOString().slice(0, 10);
    const clave = `${fechaInicial}|${fechaFinal}|${fechaPago}`;
    const current = grupos.get(clave) || {
      clave,
      fechaInicial,
      fechaFinal,
      fechaPago,
      estado: 'BORRADOR',
      total: 0,
      timbrados: 0,
      borradores: 0,
      enProceso: 0,
      errores: 0,
      totalPercepciones: 0,
      totalDeducciones: 0,
      totalNeto: 0,
    };

    current.total += 1;
    current.totalPercepciones += Number(recibo.totalPercepciones || 0);
    current.totalDeducciones += Number(recibo.totalDeducciones || 0);
    current.totalNeto += Number(recibo.totalNeto || 0);
    if (recibo.estado === 'TIMBRADO') current.timbrados += 1;
    else if (recibo.estado === 'ERROR') current.errores += 1;
    else if (recibo.estado === 'TIMBRANDO') current.enProceso += 1;
    else current.borradores += 1;

    if (current.errores > 0) current.estado = 'CON_ERRORES';
    else if (current.enProceso > 0) current.estado = 'TIMBRANDO';
    else if (current.timbrados === current.total) current.estado = 'TIMBRADO';
    else if (current.timbrados > 0) current.estado = 'PARCIAL';
    else current.estado = 'BORRADOR';

    grupos.set(clave, current);
  }

  return NextResponse.json({
    items: Array.from(grupos.values()).slice(0, 20),
  });
}
