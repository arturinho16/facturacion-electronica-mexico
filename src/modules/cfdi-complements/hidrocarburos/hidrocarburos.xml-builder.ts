import type { HidrocarburosComplementData } from './hidrocarburos.types';

type XmlBuilderNode = {
  ele: (name: string, attributes?: Record<string, string>) => XmlBuilderNode;
  up: () => XmlBuilderNode;
};

export function buildHidrocarburosAttrs(data: HidrocarburosComplementData): Record<string, string> {
  return {
    Version: data.version,
    TipoPermiso: data.tipoPermiso,
    NumeroPermiso: data.numeroPermiso,
    ClaveHYP: data.claveHYP,
    SubProductoHYP: data.subProductoHYP,
  };
}

export function appendHidrocarburosComplement(conceptoNode: XmlBuilderNode, data: HidrocarburosComplementData) {
  const complementoConcepto = conceptoNode.ele('cfdi:ComplementoConcepto');
  complementoConcepto.ele('hidrocarburospetroliferos:HidroYPetro', buildHidrocarburosAttrs(data)).up();
  complementoConcepto.up();
}
