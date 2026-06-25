export const FINKOK_STAMP_WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
export const FINKOK_STAMP_WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

export function resolveFinkokStampWsdl(customUrl: string | null | undefined, ambiente: string | null | undefined) {
  const normalizedUrl = String(customUrl || '').trim();
  if (/\/stamp\.wsdl$/i.test(normalizedUrl)) return normalizedUrl;
  return ambiente === 'demo' ? FINKOK_STAMP_WSDL_DEMO : FINKOK_STAMP_WSDL_PROD;
}
