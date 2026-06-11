import type { ConfiguracionFiscal } from '@prisma/client';
import type { DatosEmisor, EmpleadoNomina, PeriodoNomina } from '@/lib/nomina/types';

export const ymd = (value: Date | string) => {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(d.getTime()).toISOString().slice(0, 10);
};

export const calcularDiasPagados = (inicio: string, fin: string) => {
  const ini = new Date(`${inicio}T00:00:00`);
  const end = new Date(`${fin}T00:00:00`);
  const diff = Math.round((end.getTime() - ini.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
};

export const calcularAntiguedadSemanas = (inicio: Date | string, fin: Date | string) => {
  const ini = new Date(`${ymd(inicio)}T00:00:00`);
  const end = new Date(`${ymd(fin)}T00:00:00`);
  const diffDays = Math.floor((end.getTime() - ini.getTime()) / 86_400_000);
  return `P${Math.max(1, Math.floor(diffDays / 7))}W`;
};

export const calcularImporteBaseNomina = (salarioDiario: number, diasPagados: number) => {
  const base = Number(salarioDiario || 0) * Number(diasPagados || 0);
  return Math.round((base + Number.EPSILON) * 100) / 100;
};

const REGISTROS_PATRONALES_VACIOS = new Set(['0', 'N/A', 'NA', 'SIN REGISTRO', 'SIN_REGISTRO']);
const RFC_DEMO_SNCF_FINKOK = new Set(['IIA040805DZ4']);

export const limpiarRegistroPatronal = (value?: string | null) => {
  const text = String(value || '').trim().toUpperCase();
  if (!text || REGISTROS_PATRONALES_VACIOS.has(text)) return undefined;
  return text;
};

const obtenerEntidadSncfDemo = (rfc?: string | null): DatosEmisor['entidadSncf'] => {
  const normalized = String(rfc || '').trim().toUpperCase();
  if (!RFC_DEMO_SNCF_FINKOK.has(normalized)) return undefined;

  return { origenRecurso: 'IF' };
};

const CLAVES_ENTIDAD_SAT: Record<string, string> = {
  AGUASCALIENTES: 'AGU',
  AGS: 'AGU',
  BAJA_CALIFORNIA: 'BCN',
  BC: 'BCN',
  BAJA_CALIFORNIA_SUR: 'BCS',
  BCS: 'BCS',
  CAMPECHE: 'CAM',
  CAM: 'CAM',
  CHIAPAS: 'CHP',
  CHIS: 'CHP',
  CHP: 'CHP',
  CHIHUAHUA: 'CHH',
  CHIH: 'CHH',
  CHH: 'CHH',
  CIUDAD_DE_MEXICO: 'CMX',
  CIUDAD_DE_MÉXICO: 'CMX',
  CDMX: 'CMX',
  DISTRITO_FEDERAL: 'CMX',
  DF: 'CMX',
  CMX: 'CMX',
  COAHUILA: 'COA',
  COA: 'COA',
  COLIMA: 'COL',
  COL: 'COL',
  DURANGO: 'DUR',
  DUR: 'DUR',
  GUANAJUATO: 'GUA',
  GTO: 'GUA',
  GUA: 'GUA',
  GUERRERO: 'GRO',
  GRO: 'GRO',
  HIDALGO: 'HID',
  HGO: 'HID',
  HID: 'HID',
  JALISCO: 'JAL',
  JAL: 'JAL',
  MEXICO: 'MEX',
  MÉXICO: 'MEX',
  ESTADO_DE_MEXICO: 'MEX',
  ESTADO_DE_MÉXICO: 'MEX',
  EDOMEX: 'MEX',
  MEX: 'MEX',
  MICHOACAN: 'MIC',
  MICHOACÁN: 'MIC',
  MICH: 'MIC',
  MIC: 'MIC',
  MORELOS: 'MOR',
  MOR: 'MOR',
  NAYARIT: 'NAY',
  NAY: 'NAY',
  NUEVO_LEON: 'NLE',
  NUEVO_LEÓN: 'NLE',
  NL: 'NLE',
  NLE: 'NLE',
  OAXACA: 'OAX',
  OAX: 'OAX',
  PUEBLA: 'PUE',
  PUE: 'PUE',
  QUERETARO: 'QUE',
  QUERÉTARO: 'QUE',
  QRO: 'QUE',
  QUE: 'QUE',
  QUINTANA_ROO: 'ROO',
  QROO: 'ROO',
  ROO: 'ROO',
  SAN_LUIS_POTOSI: 'SLP',
  SAN_LUIS_POTOSÍ: 'SLP',
  SLP: 'SLP',
  SINALOA: 'SIN',
  SIN: 'SIN',
  SONORA: 'SON',
  SON: 'SON',
  TABASCO: 'TAB',
  TAB: 'TAB',
  TAMAULIPAS: 'TAM',
  TAM: 'TAM',
  TLAXCALA: 'TLA',
  TLAX: 'TLA',
  TLA: 'TLA',
  VERACRUZ: 'VER',
  VER: 'VER',
  YUCATAN: 'YUC',
  YUCATÁN: 'YUC',
  YUC: 'YUC',
  ZACATECAS: 'ZAC',
  ZAC: 'ZAC',
};

export const obtenerClaveEntidadSat = (estado?: string | null) => {
  const key = String(estado || 'CMX')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return CLAVES_ENTIDAD_SAT[key] || String(estado || 'CMX').slice(0, 3).toUpperCase();
};

export type EmpleadoNominaSource = {
  curp: string;
  nss?: string | null;
  fechaRelacionLaboral: Date;
  contrato: string;
  tipoJornada?: string | null;
  regimenContratacion: string;
  numEmpleado: string;
  departamento?: string | null;
  puesto?: string | null;
  riesgoPuesto?: string | null;
  periodicidad: string;
  banco?: string | null;
  clabe?: string | null;
  salario?: unknown;
  salarioCuotas?: unknown;
  estado?: string | null;
};

export const obtenerDatosEmpleadoNomina = (empleado: EmpleadoNominaSource, fechaFinalPago?: Date | string): EmpleadoNomina => ({
  curp: empleado.curp,
  nss: empleado.nss || undefined,
  fechaInicioRelLaboral: ymd(empleado.fechaRelacionLaboral),
  antiguedad: fechaFinalPago ? calcularAntiguedadSemanas(empleado.fechaRelacionLaboral, fechaFinalPago) : undefined,
  tipoContrato: empleado.contrato,
  sindicalizado: undefined,
  tipoJornada: empleado.tipoJornada || undefined,
  tipoRegimen: empleado.regimenContratacion,
  numEmpleado: empleado.numEmpleado,
  departamento: empleado.departamento || undefined,
  puesto: empleado.puesto || undefined,
  riesgoPuesto: empleado.riesgoPuesto || undefined,
  periodicidadPago: empleado.periodicidad,
  banco: empleado.banco || undefined,
  cuentaBancaria: empleado.clabe || undefined,
  salarioBaseCotApor: Number(empleado.salario || 0),
  salarioDiarioIntegrado: Number(empleado.salarioCuotas || empleado.salario || 0),
  claveEntFed: obtenerClaveEntidadSat(empleado.estado),
});

export const obtenerDatosEmisorNomina = (config: ConfiguracionFiscal): DatosEmisor => ({
  rfc: config.rfc,
  nombre: config.razonSocial,
  regimenFiscal: config.regimenFiscal,
  lugarExpedicion: config.codigoPostal,
  registroPatronal: limpiarRegistroPatronal(config.registroPatronal),
  entidadSncf: obtenerEntidadSncfDemo(config.rfc),
});

export const armarPeriodoNomina = (inicio: string, fin: string): PeriodoNomina => ({
  tipoNomina: 'O',
  fechaPago: fin,
  fechaInicial: inicio,
  fechaFinal: fin,
  numDiasPagados: calcularDiasPagados(inicio, fin),
});

export const crearPercepcionesBasicas = (importe: number) => ([
  {
    tipo: '001',
    clave: 'SDO',
    concepto: 'Sueldo',
    gravado: importe,
    exento: 0,
  },
]);
