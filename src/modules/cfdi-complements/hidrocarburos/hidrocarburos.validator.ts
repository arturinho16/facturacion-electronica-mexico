import {
  HIDROCARBUROS_CLAVES_PROD_SERV,
  HIDROCARBUROS_UNIDAD,
  type HidrocarburosClaveProdServ,
} from './hidrocarburos.constants';
import type {
  HidrocarburosConceptoInput,
  HidrocarburosEmisorConfig,
  HidrocarburosValidationResult,
} from './hidrocarburos.types';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

export function isHidrocarburosClaveProdServ(value: unknown): value is HidrocarburosClaveProdServ {
  return Object.prototype.hasOwnProperty.call(HIDROCARBUROS_CLAVES_PROD_SERV, clean(value));
}

export function requiresHidrocarburosComplement(concepto: Pick<HidrocarburosConceptoInput, 'claveProdServ' | 'requiresHypComplement'>) {
  return Boolean(concepto.requiresHypComplement) || isHidrocarburosClaveProdServ(concepto.claveProdServ);
}

export function normalizeHidrocarburosProductInput(input: {
  claveProdServ?: unknown;
  claveUnidad?: unknown;
  unidad?: unknown;
  requiresHypComplement?: unknown;
  hypClave?: unknown;
  hypSubproducto?: unknown;
}) {
  const claveProdServ = clean(input.claveProdServ);
  const requiresHypComplement = Boolean(input.requiresHypComplement) || isHidrocarburosClaveProdServ(claveProdServ);

  return {
    requiresHypComplement,
    claveUnidad: requiresHypComplement ? HIDROCARBUROS_UNIDAD.claveUnidad : clean(input.claveUnidad || 'H87'),
    unidad: requiresHypComplement ? HIDROCARBUROS_UNIDAD.unidad : clean(input.unidad || 'Pieza'),
    hypClave: requiresHypComplement ? clean(input.hypClave || claveProdServ) || null : null,
    hypSubproducto: requiresHypComplement ? clean(input.hypSubproducto) || null : null,
  };
}

export function validateHidrocarburosConcept(
  concepto: HidrocarburosConceptoInput,
  emisor: HidrocarburosEmisorConfig,
  tipoComprobante: string
): HidrocarburosValidationResult {
  const applies = requiresHidrocarburosComplement(concepto);
  if (!applies) return { applies: false, errors: [] };

  const errors: string[] = [];
  const tipo = clean(tipoComprobante).toUpperCase();
  const claveProdServ = clean(concepto.claveProdServ);
  const tipoPermiso = clean(concepto.hypTipoPermiso || emisor.hypTipoPermiso);
  const numeroPermiso = clean(concepto.hypNumeroPermiso || emisor.hypNumeroPermiso);
  const claveHYP = clean(concepto.hypClave);
  const subProductoHYP = clean(concepto.hypSubproducto);

  if (!['I', 'E'].includes(tipo)) {
    errors.push('El Complemento de Hidrocarburos y Petroliferos solo aplica en CFDI tipo I - Ingreso o E - Egreso.');
  }
  if (!isHidrocarburosClaveProdServ(claveProdServ)) {
    errors.push('Este concepto requiere Complemento de Hidrocarburos y Petroliferos.');
  }
  if (clean(concepto.claveUnidad).toUpperCase() !== HIDROCARBUROS_UNIDAD.claveUnidad || clean(concepto.unidad).toUpperCase() !== HIDROCARBUROS_UNIDAD.unidad.toUpperCase()) {
    errors.push('El combustible debe facturarse en litros con ClaveUnidad LTR.');
  }
  if (!tipoPermiso) errors.push('Falta Tipo de Permiso en la configuracion fiscal de la empresa.');
  if (!numeroPermiso) errors.push('Falta Numero de Permiso vigente.');
  if (!claveHYP) errors.push('Falta ClaveHYP del producto.');
  if (claveHYP && claveHYP !== claveProdServ) errors.push('ClaveHYP debe coincidir con la ClaveProdServ del combustible.');
  if (!subProductoHYP) errors.push('Falta SubProductoHYP del producto.');

  if (errors.length) return { applies: true, errors };

  return {
    applies: true,
    errors: [],
    data: {
      version: '1.0',
      tipoPermiso,
      numeroPermiso,
      claveHYP,
      subProductoHYP,
    },
  };
}

export function validateHidrocarburosFactura(input: {
  tipoComprobante: string;
  emisor: HidrocarburosEmisorConfig;
  conceptos: HidrocarburosConceptoInput[];
}) {
  const errors: string[] = [];
  input.conceptos.forEach((concepto, index) => {
    const result = validateHidrocarburosConcept(concepto, input.emisor, input.tipoComprobante);
    result.errors.forEach((error) => {
      errors.push(`Concepto ${index + 1}: ${error}`);
    });
  });
  return errors;
}
