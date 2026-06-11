import { regimenCompatibleConTipoContrato, tipoContratoRequiereRegistroPatronal } from '@/lib/nomina/reglas-sat';

export type OpcionCatalogo = { clave: string; descripcion: string };

export const TIPOS_CONTRATO: OpcionCatalogo[] = [
  { clave: '01', descripcion: '01 - Contrato de trabajo por tiempo indeterminado' },
  { clave: '02', descripcion: '02 - Contrato de trabajo para obra determinada' },
  { clave: '03', descripcion: '03 - Contrato de trabajo por tiempo determinado' },
  { clave: '04', descripcion: '04 - Contrato de trabajo por temporada' },
  { clave: '05', descripcion: '05 - Contrato de trabajo sujeto a prueba' },
  { clave: '06', descripcion: '06 - Contrato de trabajo con capacitación inicial' },
  { clave: '07', descripcion: '07 - Modalidad de contratación por pago de hora laborada' },
  { clave: '08', descripcion: '08 - Modalidad de trabajo por comisión laboral' },
  { clave: '09', descripcion: '09 - Modalidades de contratación donde no existe relación de trabajo' },
  { clave: '10', descripcion: '10 - Jubilación, pensión, retiro' },
  { clave: '99', descripcion: '99 - Otro contrato' },
];

export const REGIMENES_CONTRATACION: OpcionCatalogo[] = [
  { clave: '02', descripcion: '02 - Sueldos' },
  { clave: '03', descripcion: '03 - Jubilados' },
  { clave: '04', descripcion: '04 - Pensionados' },
  { clave: '05', descripcion: '05 - Asimilados miembros sociedades cooperativas de producción' },
  { clave: '06', descripcion: '06 - Asimilados integrantes sociedades o Asociaciones Civiles' },
  { clave: '07', descripcion: '07 - Asimilados miembros de consejos' },
  { clave: '08', descripcion: '08 - Asimilados comisionistas' },
  { clave: '09', descripcion: '09 - Asimilados honorarios' },
  { clave: '10', descripcion: '10 - Asimilados acciones' },
  { clave: '11', descripcion: '11 - Asimilados otros' },
  { clave: '12', descripcion: '12 - Jubilados o pensionados' },
  { clave: '13', descripcion: '13 - Indemnización o separación' },
  { clave: '99', descripcion: '99 - Otro régimen' },
];

export const TIPOS_JORNADA: OpcionCatalogo[] = [
  { clave: '01', descripcion: '01 - Diurna' },
  { clave: '02', descripcion: '02 - Nocturna' },
  { clave: '03', descripcion: '03 - Mixta' },
  { clave: '04', descripcion: '04 - Por hora' },
  { clave: '05', descripcion: '05 - Reducida' },
  { clave: '06', descripcion: '06 - Continuada' },
  { clave: '07', descripcion: '07 - Partida' },
  { clave: '08', descripcion: '08 - Por turnos' },
  { clave: '99', descripcion: '99 - Otra jornada' },
];

export const PERIODICIDADES_PAGO: OpcionCatalogo[] = [
  { clave: '01', descripcion: '01 - Diario' },
  { clave: '02', descripcion: '02 - Semanal' },
  { clave: '03', descripcion: '03 - Catorcenal' },
  { clave: '04', descripcion: '04 - Quincenal' },
  { clave: '05', descripcion: '05 - Mensual' },
  { clave: '06', descripcion: '06 - Bimestral' },
  { clave: '07', descripcion: '07 - Unidad de obra' },
  { clave: '08', descripcion: '08 - Comisión' },
  { clave: '09', descripcion: '09 - Precio alzado' },
  { clave: '10', descripcion: '10 - Decenal' },
  { clave: '99', descripcion: '99 - Otra periodicidad' },
];

export const RIESGOS_PUESTO: OpcionCatalogo[] = [
  { clave: '1', descripcion: '1 - Riesgo clase I' },
  { clave: '2', descripcion: '2 - Riesgo clase II' },
  { clave: '3', descripcion: '3 - Riesgo clase III' },
  { clave: '4', descripcion: '4 - Riesgo clase IV' },
  { clave: '5', descripcion: '5 - Riesgo clase V' },
  { clave: '99', descripcion: '99 - No aplica' },
];

export const TIPOS_NOMINA: OpcionCatalogo[] = [
  { clave: 'O', descripcion: 'O - Nómina ordinaria' },
  { clave: 'E', descripcion: 'E - Nómina extraordinaria' },
];

export const TIPOS_PERCEPCION: OpcionCatalogo[] = [
  { clave: '001', descripcion: '001 - Sueldos, salarios rayas y jornales' },
  { clave: '002', descripcion: '002 - Gratificación anual (aguinaldo)' },
  { clave: '003', descripcion: '003 - Participación de los trabajadores en las utilidades' },
  { clave: '004', descripcion: '004 - Reembolso de gastos médicos, dentales y hospitalarios' },
  { clave: '005', descripcion: '005 - Fondo de ahorro' },
  { clave: '006', descripcion: '006 - Caja de ahorro' },
  { clave: '009', descripcion: '009 - Contribuciones a cargo del trabajador pagadas por el patrón' },
  { clave: '014', descripcion: '014 - Subsidios por incapacidad' },
  { clave: '019', descripcion: '019 - Horas extra' },
  { clave: '021', descripcion: '021 - Comisiones' },
  { clave: '022', descripcion: '022 - Prima por antigüedad' },
  { clave: '023', descripcion: '023 - Pagos por separación' },
  { clave: '025', descripcion: '025 - Indemnizaciones' },
  { clave: '039', descripcion: '039 - Jubilaciones, pensiones o haberes de retiro en una exhibición' },
  { clave: '044', descripcion: '044 - Jubilaciones, pensiones o haberes de retiro en parcialidades' },
  { clave: '045', descripcion: '045 - Ingresos en acciones o títulos valor que representan bienes' },
  { clave: '046', descripcion: '046 - Ingresos asimilados a salarios' },
  { clave: '047', descripcion: '047 - Alimentación' },
  { clave: '048', descripcion: '048 - Habitación' },
  { clave: '049', descripcion: '049 - Premios por puntualidad' },
  { clave: '050', descripcion: '050 - Premios por asistencia' },
  { clave: '051', descripcion: '051 - Otros' },
];

export const TIPOS_DEDUCCION: OpcionCatalogo[] = [
  { clave: '001', descripcion: '001 - Seguridad social' },
  { clave: '002', descripcion: '002 - ISR' },
  { clave: '003', descripcion: '003 - Aportaciones a retiro, cesantía en edad avanzada y vejez' },
  { clave: '004', descripcion: '004 - Otros' },
  { clave: '005', descripcion: '005 - Aportaciones a fondos de ahorro' },
  { clave: '006', descripcion: '006 - Descuento por incapacidad' },
  { clave: '007', descripcion: '007 - Pensión alimenticia' },
  { clave: '008', descripcion: '008 - Renta' },
  { clave: '009', descripcion: '009 - Préstamos provenientes del fondo de la vivienda' },
  { clave: '010', descripcion: '010 - Pago por créditos de vivienda' },
  { clave: '011', descripcion: '011 - Pago de créditos de FONACOT' },
  { clave: '012', descripcion: '012 - Anticipo de salarios' },
  { clave: '013', descripcion: '013 - Pagos hechos con exceso al trabajador' },
  { clave: '014', descripcion: '014 - Errores o pérdidas' },
  { clave: '015', descripcion: '015 - Averías' },
  { clave: '016', descripcion: '016 - Administración de fondos, planes y pensiones' },
  { clave: '017', descripcion: '017 - Desc. por faltas y retardos' },
  { clave: '018', descripcion: '018 - Cuotas sindicales' },
  { clave: '019', descripcion: '019 - Ajuste en viáticos entregados al trabajador' },
  { clave: '020', descripcion: '020 - Ajuste en viáticos gravados' },
  { clave: '021', descripcion: '021 - Ajuste en viáticos exentos' },
  { clave: '022', descripcion: '022 - Otros descuentos' },
];

export const TIPOS_OTRO_PAGO: OpcionCatalogo[] = [
  { clave: '001', descripcion: '001 - Reintegro de gastos médicos, dentales y hospitalarios' },
  { clave: '002', descripcion: '002 - Subsidio para el empleo' },
  { clave: '003', descripcion: '003 - Viáticos entregados al trabajador' },
  { clave: '004', descripcion: '004 - Aplicación de saldo a favor por compensación anual' },
  { clave: '005', descripcion: '005 - Reintegro de ISR retenido en exceso' },
  { clave: '006', descripcion: '006 - Reintegro de ISR retenido por errores' },
  { clave: '007', descripcion: '007 - ISR ajustado por subsidio' },
  { clave: '008', descripcion: '008 - Subsidio para el empleo entregado al trabajador' },
  { clave: '009', descripcion: '009 - Reembolso de descuentos efectuados para el crédito de vivienda' },
  { clave: '010', descripcion: '010 - Compensación por servicios a extrabajadores' },
  { clave: '011', descripcion: '011 - Otros ingresos' },
];

export const TIPOS_INCAPACIDAD: OpcionCatalogo[] = [
  { clave: '01', descripcion: '01 - Riesgo de trabajo' },
  { clave: '02', descripcion: '02 - Enfermedad en general' },
  { clave: '03', descripcion: '03 - Maternidad' },
  { clave: '04', descripcion: '04 - Licencia por cuidados médicos' },
];

export const TIPOS_HORAS_EXTRA: OpcionCatalogo[] = [
  { clave: '01', descripcion: '01 - Dobles' },
  { clave: '02', descripcion: '02 - Triples' },
  { clave: '03', descripcion: '03 - Dobles y triples' },
];

export const BANCOS_SAT: OpcionCatalogo[] = [
  { clave: '002', descripcion: '002 - BANAMEX' },
  { clave: '006', descripcion: '006 - BANCOMEXT' },
  { clave: '009', descripcion: '009 - BANOBRAS' },
  { clave: '012', descripcion: '012 - BBVA' },
  { clave: '014', descripcion: '014 - SANTANDER' },
  { clave: '019', descripcion: '019 - BANJERCITO' },
  { clave: '021', descripcion: '021 - HSBC' },
  { clave: '030', descripcion: '030 - BAJIO' },
  { clave: '072', descripcion: '072 - BANORTE' },
  { clave: '127', descripcion: '127 - AZTECA' },
  { clave: '132', descripcion: '132 - Banca Mifel' },
  { clave: '137', descripcion: '137 - BBASE' },
  { clave: '138', descripcion: '138 - Banregio' },
  { clave: '143', descripcion: '143 - CIBanco' },
  { clave: '145', descripcion: '145 - Bansí' },
  { clave: '999', descripcion: '999 - Otro banco' },
];

export type EmpleadoNominaInput = {
  nombre?: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  curp?: string;
  nss?: string | null;
  rfc?: string;
  calle?: string | null;
  colonia?: string | null;
  numExterior?: string | null;
  numInterior?: string | null;
  cp?: string;
  localidad?: string | null;
  municipio?: string | null;
  estado?: string | null;
  email?: string | null;
  grupo?: string | null;
  sucursal?: string | null;
  fechaRelacionLaboral?: string | Date;
  salario?: number | string;
  salarioCuotas?: number | string;
  contrato?: string;
  regimenContratacion?: string;
  riesgoPuesto?: string;
  tipoJornada?: string;
  banco?: string | null;
  clabe?: string | null;
  periodicidad?: string;
  departamento?: string | null;
  puesto?: string | null;
  numEmpleado?: string;
  activo?: boolean;
};

export type ValidationIssue = {
  field: string;
  message: string;
};

const upper = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text.toUpperCase() : undefined;
};

const clean = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

export function normalizeEmpleadoNominaInput(input: EmpleadoNominaInput) {
  return {
    ...input,
    nombre: clean(input.nombre),
    apellidoPaterno: clean(input.apellidoPaterno),
    apellidoMaterno: clean(input.apellidoMaterno),
    curp: upper(input.curp),
    nss: clean(input.nss),
    rfc: upper(input.rfc),
    calle: clean(input.calle),
    colonia: clean(input.colonia),
    numExterior: clean(input.numExterior),
    numInterior: clean(input.numInterior),
    cp: clean(input.cp),
    localidad: clean(input.localidad),
    municipio: clean(input.municipio),
    estado: clean(input.estado),
    email: clean(input.email),
    grupo: clean(input.grupo),
    sucursal: clean(input.sucursal),
    fechaRelacionLaboral: input.fechaRelacionLaboral ? new Date(input.fechaRelacionLaboral) : undefined,
    salario: input.salario === undefined || input.salario === null || input.salario === '' ? undefined : Number(input.salario),
    salarioCuotas: input.salarioCuotas === undefined || input.salarioCuotas === null || input.salarioCuotas === '' ? undefined : Number(input.salarioCuotas),
    contrato: clean(input.contrato),
    regimenContratacion: clean(input.regimenContratacion),
    riesgoPuesto: clean(input.riesgoPuesto),
    tipoJornada: clean(input.tipoJornada),
    banco: clean(input.banco),
    clabe: clean(input.clabe),
    periodicidad: clean(input.periodicidad),
    departamento: clean(input.departamento),
    puesto: clean(input.puesto),
    numEmpleado: clean(input.numEmpleado),
    activo: input.activo ?? true,
  };
}

export function validateEmpleadoNominaInput(input: EmpleadoNominaInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required: Array<[keyof EmpleadoNominaInput, string]> = [
    ['nombre', 'Nombre(s)'],
    ['apellidoPaterno', 'Apellido paterno'],
    ['curp', 'CURP'],
    ['rfc', 'RFC'],
    ['calle', 'Calle'],
    ['colonia', 'Colonia'],
    ['numExterior', 'Número exterior'],
    ['cp', 'Código postal'],
    ['municipio', 'Municipio'],
    ['estado', 'Estado'],
    ['fechaRelacionLaboral', 'Fecha de relación laboral'],
    ['salario', 'Salario diario'],
    ['salarioCuotas', 'Salario diario integrado'],
    ['contrato', 'Tipo de contrato'],
    ['regimenContratacion', 'Régimen de contratación'],
    ['riesgoPuesto', 'Riesgo de puesto'],
    ['tipoJornada', 'Tipo de jornada'],
    ['periodicidad', 'Periodicidad de pago'],
    ['numEmpleado', 'Número de empleado'],
  ];

  for (const [field, label] of required) {
    const value = input[field];
    if (value === undefined || value === null || value === '') {
      issues.push({ field: String(field), message: `${label} es obligatorio.` });
    }
  }

  if (input.regimenContratacion === '02' && !String(input.nss || '').trim()) {
    issues.push({ field: 'nss', message: 'NSS es obligatorio para régimen de sueldos.' });
  }

  if (!regimenCompatibleConTipoContrato(input.contrato, input.regimenContratacion)) {
    const message = tipoContratoRequiereRegistroPatronal(input.contrato)
      ? 'Para contratos 01 a 08, el Régimen de contratación debe ser 02, 03 o 04.'
      : 'Para contratos 09 o superiores, el Régimen de contratación debe estar entre 05 y 99.';
    issues.push({ field: 'regimenContratacion', message });
  }

  if (input.salario !== undefined && input.salario !== null && Number(input.salario) <= 0) {
    issues.push({ field: 'salario', message: 'Salario diario debe ser mayor a cero.' });
  }

  if (input.salarioCuotas !== undefined && input.salarioCuotas !== null && Number(input.salarioCuotas) <= 0) {
    issues.push({ field: 'salarioCuotas', message: 'Salario diario integrado debe ser mayor a cero.' });
  }

  if (input.curp && String(input.curp).trim().length !== 18) {
    issues.push({ field: 'curp', message: 'La CURP debe tener 18 caracteres.' });
  }

  if (input.rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(String(input.rfc).trim())) {
    issues.push({ field: 'rfc', message: 'El RFC no tiene un formato válido.' });
  }

  if (input.cp && !/^\d{5}$/.test(String(input.cp).trim())) {
    issues.push({ field: 'cp', message: 'El código postal debe tener 5 dígitos.' });
  }

  return issues;
}

export const SAT_NOMINA_CATALOGOS = {
  TIPOS_CONTRATO,
  REGIMENES_CONTRATACION,
  TIPOS_JORNADA,
  PERIODICIDADES_PAGO,
  RIESGOS_PUESTO,
  TIPOS_NOMINA,
  TIPOS_PERCEPCION,
  TIPOS_DEDUCCION,
  TIPOS_OTRO_PAGO,
  TIPOS_INCAPACIDAD,
  TIPOS_HORAS_EXTRA,
  BANCOS_SAT,
} as const;
