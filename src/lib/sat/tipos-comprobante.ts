export const TIPOS_COMPROBANTE = [
  { clave: 'I', descripcion: 'Ingreso' },
  { clave: 'E', descripcion: 'Egreso' },
  { clave: 'T', descripcion: 'Traslado' },
  { clave: 'P', descripcion: 'Pago' },
] as const;

export type TipoComprobante = (typeof TIPOS_COMPROBANTE)[number]['clave'];

const TIPOS_VALIDOS = new Set<string>(TIPOS_COMPROBANTE.map((tipo) => tipo.clave));

export function normalizarTipoComprobante(value: unknown): TipoComprobante {
  const clave = String(value ?? 'I').trim().toUpperCase();
  return TIPOS_VALIDOS.has(clave) ? (clave as TipoComprobante) : 'I';
}

export function tipoComprobanteLabel(value: unknown) {
  const clave = normalizarTipoComprobante(value);
  const tipo = TIPOS_COMPROBANTE.find((item) => item.clave === clave);
  return tipo ? `${tipo.clave} - ${tipo.descripcion}` : 'I - Ingreso';
}

export function tipoComprobanteNombre(value: unknown) {
  const clave = normalizarTipoComprobante(value);
  return TIPOS_COMPROBANTE.find((item) => item.clave === clave)?.descripcion || 'Ingreso';
}
