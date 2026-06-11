export const CONTRATOS_REQUIEREN_REGISTRO_PATRONAL = new Set(['01', '02', '03', '04', '05', '06', '07', '08']);
export const REGIMENES_COMPATIBLES_CON_CONTRATO_LABORAL = new Set(['02', '03', '04']);
export const PERIODICIDADES_NOMINA_ORDINARIA = new Set(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']);
export const PERCEPCIONES_SEPARACION_INDEMNIZACION = new Set(['022', '023', '025']);
export const PERCEPCIONES_JUBILACION_RETIRO = new Set(['039', '044']);
export const PERCEPCIONES_REQUIEREN_HORAS_EXTRA = new Set(['019']);
export const PERCEPCIONES_REQUIEREN_INCAPACIDAD = new Set(['014']);
export const DEDUCCIONES_REQUIEREN_INCAPACIDAD = new Set(['006']);
export const OTROS_PAGOS_REQUIEREN_SUBSIDIO = new Set(['002']);
export const OTROS_PAGOS_REQUIEREN_COMPENSACION = new Set(['004']);

export const tipoContratoRequiereRegistroPatronal = (tipoContrato?: string | null) =>
  CONTRATOS_REQUIEREN_REGISTRO_PATRONAL.has(String(tipoContrato || '').trim());

export const tipoContratoEsNoLaboral = (tipoContrato?: string | null) => {
  const value = Number(String(tipoContrato || '').trim());
  return Number.isFinite(value) && value >= 9;
};

export const regimenCompatibleConTipoContrato = (tipoContrato?: string | null, tipoRegimen?: string | null) => {
  const contrato = String(tipoContrato || '').trim();
  const regimen = String(tipoRegimen || '').trim();
  if (!contrato || !regimen) return true;

  if (tipoContratoRequiereRegistroPatronal(contrato)) {
    return REGIMENES_COMPATIBLES_CON_CONTRATO_LABORAL.has(regimen);
  }

  if (tipoContratoEsNoLaboral(contrato)) {
    const value = Number(regimen);
    return Number.isFinite(value) && value >= 5 && value <= 99;
  }

  return true;
};

export const periodicidadCompatibleConTipoNomina = (tipoNomina?: string | null, periodicidad?: string | null) => {
  const tipo = String(tipoNomina || '').trim();
  const value = String(periodicidad || '').trim();
  if (!tipo || !value) return true;
  if (tipo === 'O') return PERIODICIDADES_NOMINA_ORDINARIA.has(value);
  if (tipo === 'E') return value === '99';
  return true;
};
