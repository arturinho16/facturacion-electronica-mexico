import type { Empleado } from '@prisma/client';
import { calcularDiasPagados } from '@/lib/nomina/armado';

type TarifaIsrRow = {
  limiteInferior: number;
  limiteSuperior: number;
  cuotaFija: number;
  porcentaje: number;
};

export type NominaEmpleadoCalculo = {
  diasPeriodo: number;
  diasPagados: number;
  sueldoDiario: number;
  sueldoGravado: number;
  sueldoExento: number;
  totalPercepciones: number;
  isrCausado: number;
  subsidioCausado: number;
  subsidioAplicado: number;
  isrRetenido: number;
  totalDeducciones: number;
  totalOtrosPagos: number;
  totalNeto: number;
  factorPeriodo: number;
  reglaIsr: string;
  observaciones: string[];
};

export type NominaEmpleadoSource = Pick<
  Empleado,
  'fechaRelacionLaboral' | 'salario' | 'salarioCuotas' | 'periodicidad' | 'regimenContratacion'
>;

const TARIFA_ISR_MENSUAL_2026: TarifaIsrRow[] = [
  { limiteInferior: 0.01, limiteSuperior: 844.59, cuotaFija: 0, porcentaje: 0.0192 },
  { limiteInferior: 844.60, limiteSuperior: 7168.51, cuotaFija: 16.22, porcentaje: 0.064 },
  { limiteInferior: 7168.52, limiteSuperior: 12598.02, cuotaFija: 420.95, porcentaje: 0.1088 },
  { limiteInferior: 12598.03, limiteSuperior: 14644.64, cuotaFija: 1011.68, porcentaje: 0.16 },
  { limiteInferior: 14644.65, limiteSuperior: 17533.64, cuotaFija: 1339.14, porcentaje: 0.1792 },
  { limiteInferior: 17533.65, limiteSuperior: 35362.83, cuotaFija: 1856.84, porcentaje: 0.2136 },
  { limiteInferior: 35362.84, limiteSuperior: 55736.68, cuotaFija: 5665.16, porcentaje: 0.2352 },
  { limiteInferior: 55736.69, limiteSuperior: 106410.50, cuotaFija: 10457.09, porcentaje: 0.30 },
  { limiteInferior: 106410.51, limiteSuperior: 141880.66, cuotaFija: 25659.23, porcentaje: 0.32 },
  { limiteInferior: 141880.67, limiteSuperior: 425641.99, cuotaFija: 37009.69, porcentaje: 0.34 },
  { limiteInferior: 425642.00, limiteSuperior: Number.POSITIVE_INFINITY, cuotaFija: 133488.54, porcentaje: 0.35 },
];

const TARIFAS_ISR_2026_POR_PERIODICIDAD: Record<string, TarifaIsrRow[]> = {
  '01': [
    { limiteInferior: 0.01, limiteSuperior: 27.78, cuotaFija: 0, porcentaje: 0.0192 },
    { limiteInferior: 27.79, limiteSuperior: 235.81, cuotaFija: 0.53, porcentaje: 0.064 },
    { limiteInferior: 235.82, limiteSuperior: 414.41, cuotaFija: 13.85, porcentaje: 0.1088 },
    { limiteInferior: 414.42, limiteSuperior: 481.73, cuotaFija: 33.28, porcentaje: 0.16 },
    { limiteInferior: 481.74, limiteSuperior: 576.76, cuotaFija: 44.05, porcentaje: 0.1792 },
    { limiteInferior: 576.77, limiteSuperior: 1163.25, cuotaFija: 61.08, porcentaje: 0.2136 },
    { limiteInferior: 1163.26, limiteSuperior: 1833.44, cuotaFija: 186.35, porcentaje: 0.2352 },
    { limiteInferior: 1833.45, limiteSuperior: 3500.35, cuotaFija: 343.98, porcentaje: 0.30 },
    { limiteInferior: 3500.36, limiteSuperior: 4667.13, cuotaFija: 844.05, porcentaje: 0.32 },
    { limiteInferior: 4667.14, limiteSuperior: 14001.38, cuotaFija: 1217.42, porcentaje: 0.34 },
    { limiteInferior: 14001.39, limiteSuperior: Number.POSITIVE_INFINITY, cuotaFija: 4391.07, porcentaje: 0.35 },
  ],
  '02': [
    { limiteInferior: 0.01, limiteSuperior: 194.46, cuotaFija: 0, porcentaje: 0.0192 },
    { limiteInferior: 194.47, limiteSuperior: 1650.67, cuotaFija: 3.71, porcentaje: 0.064 },
    { limiteInferior: 1650.68, limiteSuperior: 2900.87, cuotaFija: 96.95, porcentaje: 0.1088 },
    { limiteInferior: 2900.88, limiteSuperior: 3372.11, cuotaFija: 232.96, porcentaje: 0.16 },
    { limiteInferior: 3372.12, limiteSuperior: 4037.32, cuotaFija: 308.35, porcentaje: 0.1792 },
    { limiteInferior: 4037.33, limiteSuperior: 8142.75, cuotaFija: 427.56, porcentaje: 0.2136 },
    { limiteInferior: 8142.76, limiteSuperior: 12834.08, cuotaFija: 1304.45, porcentaje: 0.2352 },
    { limiteInferior: 12834.09, limiteSuperior: 24502.45, cuotaFija: 2407.86, porcentaje: 0.30 },
    { limiteInferior: 24502.46, limiteSuperior: 32669.91, cuotaFija: 5908.35, porcentaje: 0.32 },
    { limiteInferior: 32669.92, limiteSuperior: 98009.66, cuotaFija: 8521.94, porcentaje: 0.34 },
    { limiteInferior: 98009.67, limiteSuperior: Number.POSITIVE_INFINITY, cuotaFija: 30737.49, porcentaje: 0.35 },
  ],
  '04': [
    { limiteInferior: 0.01, limiteSuperior: 416.70, cuotaFija: 0, porcentaje: 0.0192 },
    { limiteInferior: 416.71, limiteSuperior: 3537.15, cuotaFija: 7.95, porcentaje: 0.064 },
    { limiteInferior: 3537.16, limiteSuperior: 6216.15, cuotaFija: 207.75, porcentaje: 0.1088 },
    { limiteInferior: 6216.16, limiteSuperior: 7225.95, cuotaFija: 499.20, porcentaje: 0.16 },
    { limiteInferior: 7225.96, limiteSuperior: 8651.40, cuotaFija: 660.75, porcentaje: 0.1792 },
    { limiteInferior: 8651.41, limiteSuperior: 17448.75, cuotaFija: 916.20, porcentaje: 0.2136 },
    { limiteInferior: 17448.76, limiteSuperior: 27501.60, cuotaFija: 2795.25, porcentaje: 0.2352 },
    { limiteInferior: 27501.61, limiteSuperior: 52505.25, cuotaFija: 5159.70, porcentaje: 0.30 },
    { limiteInferior: 52505.26, limiteSuperior: 70006.95, cuotaFija: 12660.75, porcentaje: 0.32 },
    { limiteInferior: 70006.96, limiteSuperior: 210020.70, cuotaFija: 18261.30, porcentaje: 0.34 },
    { limiteInferior: 210020.71, limiteSuperior: Number.POSITIVE_INFINITY, cuotaFija: 65866.05, porcentaje: 0.35 },
  ],
  '05': TARIFA_ISR_MENSUAL_2026,
  '10': [
    { limiteInferior: 0.01, limiteSuperior: 277.80, cuotaFija: 0, porcentaje: 0.0192 },
    { limiteInferior: 277.81, limiteSuperior: 2358.10, cuotaFija: 5.30, porcentaje: 0.064 },
    { limiteInferior: 2358.11, limiteSuperior: 4144.10, cuotaFija: 138.50, porcentaje: 0.1088 },
    { limiteInferior: 4144.11, limiteSuperior: 4817.30, cuotaFija: 332.80, porcentaje: 0.16 },
    { limiteInferior: 4817.31, limiteSuperior: 5767.60, cuotaFija: 440.50, porcentaje: 0.1792 },
    { limiteInferior: 5767.61, limiteSuperior: 11632.50, cuotaFija: 610.80, porcentaje: 0.2136 },
    { limiteInferior: 11632.51, limiteSuperior: 18334.40, cuotaFija: 1863.50, porcentaje: 0.2352 },
    { limiteInferior: 18334.41, limiteSuperior: 35003.50, cuotaFija: 3439.80, porcentaje: 0.30 },
    { limiteInferior: 35003.51, limiteSuperior: 46671.30, cuotaFija: 8440.50, porcentaje: 0.32 },
    { limiteInferior: 46671.31, limiteSuperior: 140013.80, cuotaFija: 12174.20, porcentaje: 0.34 },
    { limiteInferior: 140013.81, limiteSuperior: Number.POSITIVE_INFINITY, cuotaFija: 43910.70, porcentaje: 0.35 },
  ],
};

const DIAS_PROMEDIO_MES = 30.4;
const LIMITE_SUBSIDIO_MENSUAL_2026 = 11492.66;
const SUBSIDIO_MENSUAL_ENERO_2026 = 536.21;
const SUBSIDIO_MENSUAL_GENERAL_2026 = 535.65;

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDateOnly = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const ymd = (date: Date) => date.toISOString().slice(0, 10);

export function calcularDiasLaborados(inicio: string, fin: string, fechaRelacionLaboral: Date) {
  const inicioPeriodo = toDateOnly(inicio);
  const finPeriodo = toDateOnly(fin);
  const inicioLaboral = toDateOnly(fechaRelacionLaboral);

  if (inicioLaboral > finPeriodo) return 0;

  const inicioReal = inicioLaboral > inicioPeriodo ? inicioLaboral : inicioPeriodo;
  return calcularDiasPagados(ymd(inicioReal), ymd(finPeriodo));
}

export function obtenerFactorPeriodo(periodicidad: string, diasPagados: number) {
  switch (periodicidad) {
    case '01':
      return DIAS_PROMEDIO_MES;
    case '02':
      return DIAS_PROMEDIO_MES / 7;
    case '03':
      return DIAS_PROMEDIO_MES / 14;
    case '04':
      return DIAS_PROMEDIO_MES / 15;
    case '05':
      return 1;
    case '06':
      return 0.5;
    case '10':
      return DIAS_PROMEDIO_MES / 10;
    default:
      return Math.max(DIAS_PROMEDIO_MES / Math.max(diasPagados, 1), 1);
  }
}

function calcularIsrConTarifa(baseGravable: number, factorPeriodo: number, periodicidad: string) {
  if (baseGravable <= 0) return 0;

  const tarifaPeriodo = TARIFAS_ISR_2026_POR_PERIODICIDAD[periodicidad]
    || TARIFA_ISR_MENSUAL_2026.map((tarifa) => ({
      limiteInferior: tarifa.limiteInferior / factorPeriodo,
      limiteSuperior: tarifa.limiteSuperior / factorPeriodo,
      cuotaFija: tarifa.cuotaFija / factorPeriodo,
      porcentaje: tarifa.porcentaje,
    }));

  const row = tarifaPeriodo.find((tarifa) => baseGravable >= tarifa.limiteInferior && baseGravable <= tarifa.limiteSuperior);

  if (!row) return 0;

  return roundMoney(row.cuotaFija + ((baseGravable - row.limiteInferior) * row.porcentaje));
}

function calcularSubsidioEmpleo(baseGravable: number, factorPeriodo: number, fechaPago: string, isrCausado: number) {
  const ingresoMensualizado = baseGravable * factorPeriodo;
  if (ingresoMensualizado > LIMITE_SUBSIDIO_MENSUAL_2026 || isrCausado <= 0) {
    return { causado: 0, aplicado: 0 };
  }

  const month = toDateOnly(fechaPago).getMonth();
  const subsidioMensual = month === 0 ? SUBSIDIO_MENSUAL_ENERO_2026 : SUBSIDIO_MENSUAL_GENERAL_2026;
  const causado = roundMoney(subsidioMensual / factorPeriodo);
  return { causado, aplicado: roundMoney(Math.min(isrCausado, causado)) };
}

export function calcularNominaEmpleado(params: {
  empleado: NominaEmpleadoSource;
  inicio: string;
  fin: string;
  fechaPago?: string;
}): NominaEmpleadoCalculo {
  const fechaPago = params.fechaPago || params.fin;
  const diasPeriodo = calcularDiasPagados(params.inicio, params.fin);
  const diasPagados = calcularDiasLaborados(params.inicio, params.fin, params.empleado.fechaRelacionLaboral);
  const salarioDiario = Number(params.empleado.salario || 0);
  const salarioDiarioIntegrado = Number(params.empleado.salarioCuotas || 0);
  const sueldoDiario = salarioDiario > 0 ? salarioDiario : salarioDiarioIntegrado;
  const observaciones: string[] = [];

  if (diasPagados < diasPeriodo) {
    observaciones.push(`Días pagados ajustados a ${diasPagados} por fecha de relación laboral.`);
  }
  if (salarioDiario <= 0 && salarioDiarioIntegrado > 0) {
    observaciones.push('Se usó salario diario integrado porque el salario diario está en cero.');
  }

  const sueldoGravado = roundMoney(sueldoDiario * diasPagados);
  const factorPeriodo = obtenerFactorPeriodo(params.empleado.periodicidad, diasPagados || diasPeriodo);
  const isAsimilado = params.empleado.regimenContratacion !== '02';
  const isrCausado = calcularIsrConTarifa(sueldoGravado, factorPeriodo, params.empleado.periodicidad);
  const subsidio = isAsimilado
    ? { causado: 0, aplicado: 0 }
    : calcularSubsidioEmpleo(sueldoGravado, factorPeriodo, fechaPago, isrCausado);
  const isrRetenido = roundMoney(Math.max(0, isrCausado - subsidio.aplicado));
  const totalDeducciones = isrRetenido;
  const totalPercepciones = sueldoGravado;

  if (isAsimilado) {
    observaciones.push('Subsidio al empleo no aplicado por régimen distinto de sueldos.');
  }

  return {
    diasPeriodo,
    diasPagados,
    sueldoDiario,
    sueldoGravado,
    sueldoExento: 0,
    totalPercepciones,
    isrCausado,
    subsidioCausado: subsidio.causado,
    subsidioAplicado: subsidio.aplicado,
    isrRetenido,
    totalDeducciones,
    totalOtrosPagos: 0,
    totalNeto: roundMoney(totalPercepciones - totalDeducciones),
    factorPeriodo,
    reglaIsr: 'ISR Art. 96 LISR 2026 mensual prorrateado por periodicidad SAT; subsidio empleo DOF 31/12/2025.',
    observaciones,
  };
}
