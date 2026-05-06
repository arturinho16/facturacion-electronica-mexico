import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { armarPeriodoNomina } from '@/lib/nomina/armado';

const parseFecha = (value: string) => new Date(`${value}T12:00:00`);

const resumirEstadoPeriodo = (estados: string[]) => {
  if (!estados.length) return 'SIN_RECIBOS';
  if (estados.every((estado) => estado === 'TIMBRADO')) return 'TIMBRADO';
  if (estados.some((estado) => estado === 'ERROR')) return 'CON_ERRORES';
  if (estados.some((estado) => estado === 'TIMBRANDO')) return 'TIMBRANDO';
  if (estados.some((estado) => estado === 'TIMBRADO')) return 'PARCIAL';
  return 'BORRADOR';
};

export async function GET(req: NextRequest) {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const inicio = req.nextUrl.searchParams.get('inicio');
  const fin = req.nextUrl.searchParams.get('fin');

  if (!inicio || !fin) {
    return NextResponse.json({ error: 'Debes seleccionar fecha inicial y fecha final.' }, { status: 400 });
  }

  const periodo = armarPeriodoNomina(inicio, fin);
  const fechaInicialPago = parseFecha(inicio);
  const fechaFinalPago = parseFecha(fin);

  const empleados = await prisma.empleado.findMany({
    where: { activo: true },
    orderBy: [{ apellidoPaterno: 'asc' }, { nombre: 'asc' }],
    include: {
      recibos: {
        where: { fechaInicialPago, fechaFinalPago },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const estados = empleados.flatMap((emp) => emp.recibos.map((recibo) => recibo.estado));

  return NextResponse.json({
    periodo: {
      ...periodo,
      estado: resumirEstadoPeriodo(estados),
      totalEmpleados: empleados.length,
      conRecibo: estados.length,
    },
    items: empleados.map((emp) => ({
      id: emp.recibos[0]?.id || emp.id,
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ''}`.trim(),
      empleadoRfc: emp.rfc,
      fechaPago: emp.recibos[0]?.fechaPago || periodo.fechaPago,
      totalPercepciones: Number(emp.recibos[0]?.totalPercepciones || 0),
      totalDeducciones: Number(emp.recibos[0]?.totalDeducciones || 0),
      totalNeto: Number(emp.recibos[0]?.totalNeto || 0),
      estado: emp.recibos[0]?.estado || 'PRE-CALCULO',
    })),
  });
}
