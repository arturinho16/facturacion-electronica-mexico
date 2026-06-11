export const HIDROCARBUROS_NAMESPACE = 'http://www.sat.gob.mx/hidrocarburospetroliferos';

export const HIDROCARBUROS_SCHEMA_LOCATION =
  `${HIDROCARBUROS_NAMESPACE} http://www.sat.gob.mx/sitio_internet/cfd/hidrocarburospetroliferos/hidrocarburospetroliferos.xsd`;

export const HIDROCARBUROS_UNIDAD = {
  claveUnidad: 'LTR',
  unidad: 'Litro',
} as const;

export const HIDROCARBUROS_CLAVES_PROD_SERV = {
  '15101505': 'Diesel',
  '15101514': 'Gasolina regular menor a 91 octanos',
  '15101515': 'Gasolina premium mayor o igual a 91 octanos',
} as const;

export type HidrocarburosClaveProdServ = keyof typeof HIDROCARBUROS_CLAVES_PROD_SERV;
