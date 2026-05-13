export type HidrocarburosEmisorConfig = {
  hypEnabled?: boolean | null;
  hypTipoPermiso?: string | null;
  hypNumeroPermiso?: string | null;
};

export type HidrocarburosConceptoInput = {
  claveProdServ: string;
  claveUnidad: string;
  unidad?: string | null;
  descripcion?: string | null;
  requiresHypComplement?: boolean | null;
  hypClave?: string | null;
  hypSubproducto?: string | null;
  hypTipoPermiso?: string | null;
  hypNumeroPermiso?: string | null;
};

export type HidrocarburosComplementData = {
  version: '1.0';
  tipoPermiso: string;
  numeroPermiso: string;
  claveHYP: string;
  subProductoHYP: string;
};

export type HidrocarburosValidationResult = {
  applies: boolean;
  errors: string[];
  data?: HidrocarburosComplementData;
};
