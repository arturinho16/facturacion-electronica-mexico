export const EXPEDIENTE_PERFILES = [
  { clave: 'principal', titulo: 'Expediente Fiscal', etiqueta: 'RFC principal', ruta: '/expediente-fiscal', principal: true },
  { clave: 'perfil_1', titulo: 'Expediente Fiscal - RFC-1', etiqueta: 'RFC-1', ruta: '/expediente-fiscal/perfil-1', principal: false },
  { clave: 'perfil_2', titulo: 'Expediente Fiscal - RFC-2', etiqueta: 'RFC-2', ruta: '/expediente-fiscal/perfil-2', principal: false },
  { clave: 'perfil_3', titulo: 'Expediente Fiscal - RFC-3', etiqueta: 'RFC-3', ruta: '/expediente-fiscal/perfil-3', principal: false },
] as const;

export const EXPEDIENTE_TIPOS_DOCUMENTO = [
  { clave: 'CIF', label: 'Constancia de Situación Fiscal / CIF', criticidad: 'alta' },
  { clave: 'DECLARACION_PRESENTADA', label: 'Declaraciones presentadas', criticidad: 'alta' },
  { clave: 'DECLARACION_PENDIENTE', label: 'Declaraciones pendientes', criticidad: 'alta' },
  { clave: 'ACUSE', label: 'Acuses y comprobantes', criticidad: 'media' },
  { clave: 'LINEA_CAPTURA', label: 'Líneas de captura', criticidad: 'alta' },
  { clave: 'PAGO', label: 'Pagos', criticidad: 'alta' },
  { clave: 'OPINION_CUMPLIMIENTO', label: 'Opinión de cumplimiento', criticidad: 'alta' },
] as const;

export const EXPEDIENTE_ESTATUS = [
  'VIGENTE',
  'POSITIVA',
  'NEGATIVA',
  'PENDIENTE',
  'VENCIDO',
  'PAGADO',
  'SIN_EVIDENCIA',
  'SIN_REVISAR',
  'ERROR',
] as const;

export type ExpedientePerfilClave = (typeof EXPEDIENTE_PERFILES)[number]['clave'];
export type ExpedienteTipoDocumento = (typeof EXPEDIENTE_TIPOS_DOCUMENTO)[number]['clave'];
export type ExpedienteEstatus = (typeof EXPEDIENTE_ESTATUS)[number];

const PERFIL_CLAVES = new Set<string>(EXPEDIENTE_PERFILES.map((perfil) => perfil.clave));
const TIPO_CLAVES = new Set<string>(EXPEDIENTE_TIPOS_DOCUMENTO.map((tipo) => tipo.clave));
const ESTATUS_CLAVES = new Set<string>(EXPEDIENTE_ESTATUS);

export function normalizarExpedientePerfil(input: unknown): ExpedientePerfilClave {
  const value = String(input || '').trim();
  return PERFIL_CLAVES.has(value) ? (value as ExpedientePerfilClave) : 'principal';
}

export function normalizarExpedienteTipo(input: unknown): ExpedienteTipoDocumento {
  const value = String(input || '').trim().toUpperCase();
  return TIPO_CLAVES.has(value) ? (value as ExpedienteTipoDocumento) : 'CIF';
}

export function normalizarExpedienteEstatus(input: unknown): ExpedienteEstatus {
  const value = String(input || '').trim().toUpperCase();
  return ESTATUS_CLAVES.has(value) ? (value as ExpedienteEstatus) : 'SIN_REVISAR';
}

export function expedienteTipoLabel(input: unknown) {
  const tipo = normalizarExpedienteTipo(input);
  return EXPEDIENTE_TIPOS_DOCUMENTO.find((item) => item.clave === tipo)?.label || 'Documento fiscal';
}

export function expedientePerfilFromPath(pathname: string): ExpedientePerfilClave {
  if (pathname.includes('/perfil-1')) return 'perfil_1';
  if (pathname.includes('/perfil-2')) return 'perfil_2';
  if (pathname.includes('/perfil-3')) return 'perfil_3';
  return 'principal';
}
