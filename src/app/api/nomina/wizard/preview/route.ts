import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { armarPeriodoNomina } from '@/lib/nomina/armado';
import { validateEmpleadoNominaInput } from '@/lib/nomina/catalogos';
import { calcularNominaEmpleado, roundMoney } from '@/lib/nomina/calculo';

type PreviewRow = {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  empleadoRfc: string;
  fechaPago: Date;
  diasPagados: number;
  totalPercepciones: number;
  totalDeducciones: number;
  totalNeto: number;
  estado: string;
  calculo: {
    sueldoDiario: number;
    isrCausado: number;
    subsidioAplicado: number;
    isrRetenido: number;
    reglaIsr: string;
    observaciones: string[];
  };
};

const parseFecha = (value: string) => new Date(`${value}T12:00:00`);

type DeduccionExtraInput = {
  tipoDeduccion?: string;
  clave?: string;
  concepto?: string;
  importe?: number | string;
};

export async function POST(req: NextRequest) {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const { reciboIds, inicio, fin, deduccionesExtra } = await req.json();
  if (!reciboIds || !reciboIds.length) {
    return NextResponse.json({ error: 'Debes seleccionar al menos un empleado.' }, { status: 400 });
  }
  if (!inicio || !fin) {
    return NextResponse.json({ error: 'Debes seleccionar fecha inicial y fecha final.' }, { status: 400 });
  }

  const periodo = armarPeriodoNomina(inicio, fin);
  const deduccionesAdicionales = Array.isArray(deduccionesExtra)
    ? deduccionesExtra
      .map((deduccion: DeduccionExtraInput, idx: number) => ({
        tipoDeduccion: String(deduccion.tipoDeduccion || '').trim(),
        clave: String(deduccion.clave || `D${idx + 10}`).trim(),
        concepto: String(deduccion.concepto || '').trim(),
        importe: Number(deduccion.importe || 0),
      }))
      .filter((deduccion) => deduccion.tipoDeduccion && deduccion.concepto && deduccion.importe > 0)
    : [];
  const fechaPago = parseFecha(periodo.fechaPago);
  const fechaInicialPago = parseFecha(periodo.fechaInicial);
  const fechaFinalPago = parseFecha(periodo.fechaFinal);
  const nuevosRecibos: PreviewRow[] = [];
  const rechazados: Array<{ empleadoId: string; motivo: string }> = [];

  for (const rawId of reciboIds) {
    const id = String(rawId);
    const reciboExistente = await prisma.reciboNomina.findFirst({
      where: { id },
      select: { empleadoId: true },
    });
    const empId = reciboExistente?.empleadoId || id;
    const emp = await prisma.empleado.findUnique({ where: { id: empId } });
    if (!emp) {
      rechazados.push({ empleadoId: String(empId), motivo: 'Empleado no encontrado.' });
      continue;
    }

    const issues = validateEmpleadoNominaInput({
      nombre: emp.nombre,
      apellidoPaterno: emp.apellidoPaterno,
      apellidoMaterno: emp.apellidoMaterno,
      curp: emp.curp,
      nss: emp.nss,
      rfc: emp.rfc,
      calle: emp.calle,
      colonia: emp.colonia,
      numExterior: emp.numExterior,
      numInterior: emp.numInterior,
      cp: emp.cp,
      localidad: emp.localidad,
      municipio: emp.municipio,
      estado: emp.estado,
      email: emp.email,
      grupo: emp.grupo,
      sucursal: emp.sucursal,
      fechaRelacionLaboral: emp.fechaRelacionLaboral,
      salario: Number(emp.salario),
      salarioCuotas: Number(emp.salarioCuotas),
      contrato: emp.contrato,
      regimenContratacion: emp.regimenContratacion,
      riesgoPuesto: emp.riesgoPuesto,
      tipoJornada: emp.tipoJornada,
      banco: emp.banco,
      clabe: emp.clabe,
      periodicidad: emp.periodicidad,
      departamento: emp.departamento,
      puesto: emp.puesto,
      numEmpleado: emp.numEmpleado,
    });

    if (issues.length) {
      rechazados.push({
        empleadoId: emp.id,
        motivo: issues.map((x) => x.message).join(' '),
      });
      continue;
    }

    const calculo = calcularNominaEmpleado({ empleado: emp, inicio, fin, fechaPago: periodo.fechaPago });
    if (calculo.diasPagados <= 0) {
      rechazados.push({
        empleadoId: emp.id,
        motivo: 'La fecha de relación laboral es posterior al periodo seleccionado.',
      });
      continue;
    }

    const existente = await prisma.reciboNomina.findFirst({
      where: { empleadoId: emp.id, fechaInicialPago, fechaFinalPago },
      include: { empleado: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existente?.estado === 'TIMBRADO') {
      nuevosRecibos.push({
        id: existente.id,
        empleadoId: emp.id,
        empleadoNombre: `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ''}`.trim(),
        empleadoRfc: emp.rfc,
        fechaPago: existente.fechaPago,
        diasPagados: Number(existente.numDiasPagados),
        totalPercepciones: Number(existente.totalPercepciones),
        totalDeducciones: Number(existente.totalDeducciones),
        totalNeto: Number(existente.totalNeto),
        estado: existente.estado,
        calculo: {
          sueldoDiario: calculo.sueldoDiario,
          isrCausado: calculo.isrCausado,
          subsidioAplicado: calculo.subsidioAplicado,
          isrRetenido: calculo.isrRetenido,
          reglaIsr: calculo.reglaIsr,
          observaciones: ['Recibo ya timbrado; no se recalculó.'],
        },
      });
      continue;
    }

    const deducciones = calculo.isrRetenido > 0 ? [
      {
        tipoDeduccion: '002',
        clave: 'D002',
        concepto: 'ISR',
        importe: calculo.isrRetenido,
      },
    ] : [];
    const deduccionesCreate = [
      ...deducciones,
      ...deduccionesAdicionales,
    ];
    const totalDeducciones = roundMoney(deduccionesCreate.reduce((sum, deduccion) => sum + Number(deduccion.importe || 0), 0));
    const totalNeto = roundMoney(calculo.totalPercepciones - totalDeducciones);
    const regimenNumerico = Number(emp.regimenContratacion);
    const esAsimilado = Number.isFinite(regimenNumerico) && regimenNumerico >= 5 && regimenNumerico <= 11;
    const percepcionBase = esAsimilado
      ? { tipoPercepcion: '046', clave: 'P046', concepto: 'Ingresos asimilados a salarios' }
      : { tipoPercepcion: '001', clave: 'P001', concepto: 'Sueldo' };

    const data = {
        empleadoId: emp.id,
        fechaPago,
        fechaInicialPago,
        fechaFinalPago,
        numDiasPagados: calculo.diasPagados,
        totalPercepciones: calculo.totalPercepciones,
        totalDeducciones,
        totalOtrosPagos: calculo.totalOtrosPagos,
        totalNeto,
        estado: 'BORRADOR',
        mensajeError: null,
        percepciones: {
          create: [
            {
              tipoPercepcion: percepcionBase.tipoPercepcion,
              clave: percepcionBase.clave,
              concepto: percepcionBase.concepto,
              importeGravado: calculo.sueldoGravado,
              importeExento: calculo.sueldoExento,
            },
          ],
        },
        deducciones: { create: deduccionesCreate },
      };

    const recibo = existente
      ? await prisma.reciboNomina.update({
        where: { id: existente.id },
        data: {
          fechaPago: data.fechaPago,
          numDiasPagados: data.numDiasPagados,
          totalPercepciones: data.totalPercepciones,
          totalDeducciones: data.totalDeducciones,
          totalOtrosPagos: data.totalOtrosPagos,
          totalNeto: data.totalNeto,
          estado: data.estado,
          mensajeError: data.mensajeError,
          percepciones: { deleteMany: {}, create: data.percepciones.create },
          deducciones: { deleteMany: {}, create: data.deducciones.create },
        },
      })
      : await prisma.reciboNomina.create({ data });

    nuevosRecibos.push({
      id: recibo.id,
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno || ''}`.trim(),
      empleadoRfc: emp.rfc,
      fechaPago: recibo.fechaPago,
      diasPagados: Number(recibo.numDiasPagados),
      totalPercepciones: Number(recibo.totalPercepciones),
      totalDeducciones: Number(recibo.totalDeducciones),
      totalNeto: Number(recibo.totalNeto),
      estado: recibo.estado,
      calculo: {
        sueldoDiario: calculo.sueldoDiario,
        isrCausado: calculo.isrCausado,
        subsidioAplicado: calculo.subsidioAplicado,
        isrRetenido: calculo.isrRetenido,
        reglaIsr: calculo.reglaIsr,
        observaciones: calculo.observaciones,
      },
    });
  }

  return NextResponse.json({ items: nuevosRecibos, rechazados, periodo });
}
