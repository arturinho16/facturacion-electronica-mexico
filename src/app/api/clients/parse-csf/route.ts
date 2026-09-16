import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ── Word segmentation para calles sin espacios ────────────────────────────────
const PALABRAS_CALLE = new Set([
  'FRANCISCO', 'CLAVIJERO', 'BENITO', 'JUAREZ', 'HIDALGO', 'MORELOS', 'ZAPATA',
  'MADERO', 'ALLENDE', 'ALDAMA', 'ABASOLO', 'GUERRERO', 'VICTORIA', 'ITURBIDE',
  'REFORMA', 'REVOLUCION', 'INDEPENDENCIA', 'CONSTITUCION', 'LIBERTAD', 'UNION',
  'MEXICO', 'NACIONAL', 'FEDERAL', 'CENTRAL', 'NORTE', 'SUR', 'ORIENTE', 'PONIENTE',
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SEPTIMA', 'OCTAVA',
  'NOVENA', 'DECIMA', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'MIGUEL', 'ANGEL', 'JOSE', 'MARIA', 'JUAN', 'PEDRO', 'PABLO', 'LUIS', 'CARLOS',
  'ANTONIO', 'MANUEL', 'RAFAEL', 'GABRIEL', 'IGNACIO', 'AGUSTIN', 'VICENTE',
  'LAZARO', 'CARDENAS', 'OBREGON', 'CALLES', 'DIAZ', 'LOPEZ', 'MATEOS', 'ECHEVERRIA',
  'PORTILLO', 'SALINAS', 'ZEDILLO', 'FOX', 'CALDERON', 'PEÑA', 'NIETO',
  'SIMON', 'BOLIVAR', 'WASHINGTON', 'LINCOLN', 'KENNEDY', 'ROOSEVELT',
  'MELCHOR', 'OCAMPO', 'CAMPO', 'HERRERA', 'MACLOVIO', 'CORONA', 'MONROY',
  'AVENIDA', 'BOULEVARD', 'CALZADA', 'PRIVADA', 'ANDADOR', 'CERRADA', 'CIRCUITO',
  'PASEO', 'PROLONGACION', 'RETORNO', 'VIADUCTO', 'PERIFERICO', 'ANILLO',
  'REAL', 'NUEVO', 'NUEVA', 'GRAN', 'GRANDE', 'ALTO', 'BAJA', 'BELLA', 'BELLO',
  'LOMAS', 'COLINAS', 'JARDINES', 'BOSQUES', 'PRADOS', 'VALLES', 'RINCON',
  'SAN', 'SANTA', 'SANTO', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y',
  'PACHUCA', 'SOTO', 'TULANCINGO', 'TULA', 'ACTOPAN', 'IXMIQUILPAN', 'APAN',
  'GUADALAJARA', 'MONTERREY', 'PUEBLA', 'OAXACA', 'MERIDA', 'TIJUANA', 'LEON',
  'QUERETARO', 'AGUASCALIENTES', 'HERMOSILLO', 'CULIACAN', 'DURANGO', 'TOLUCA',
  'CUERNAVACA', 'XALAPA', 'VILLAHERMOSA', 'TUXTLA', 'CAMPECHE', 'CHETUMAL',
  'TEPIC', 'COLIMA', 'CHILPANCINGO', 'TLAXCALA', 'ZACATECAS', 'GUANAJUATO',
  'POTOSI', 'SALTILLO', 'CHIHUAHUA', 'MORELIA', 'JALAPA', 'INSURGENTES',
  'JUAREZ', 'HIDALGO', 'GUERRERO', 'ALDAMA', 'ALLENDE', 'ABASOLO', 'BRAVO',
  'DEGOLLADO', 'MOCTEZUMA', 'CUAUHTEMOC', 'TLAPALERIA', 'FERROCARRIL',
  'INDUSTRIA', 'COMERCIO', 'TRABAJO', 'PROGRESO', 'ESPERANZA', 'PAZ', 'AMOR',
  'ROBLE', 'CEDRO', 'PINO', 'OLMO', 'FRESNO', 'SAUCE', 'NOGAL', 'ENCINO',
  'ROSA', 'CLAVEL', 'JAZMIN', 'LIRIO', 'VIOLETA', 'AZALEA', 'BEGONIA',
  'AGUILA', 'CONDOR', 'PALOMA', 'GOLONDRINA', 'CANARIO', 'JILGUERO', 'IBARRA', 'OLIVARES', 'JOSE',
]);

const PALABRAS_RAZON_SOCIAL = new Set([
  ...PALABRAS_CALLE,
  'ABASTECEDORA', 'ADMINISTRADORA', 'AGENCIA', 'AGRARIA', 'AGRÍCOLA', 'AGRICOLA',
  'AGROPECUARIA', 'ALIMENTOS', 'ARRENDADORA', 'ASESORIA', 'ASESORÍA', 'ASOCIACION',
  'ASOCIACIÓN', 'AUTOMOTRIZ', 'BANCO', 'BEBIDAS', 'BIENES', 'CADENA', 'CAPITAL',
  'CENTRO', 'COMERCIAL', 'COMERCIALIZADORA', 'COMERCIO', 'COMPAÑIA', 'COMPANIA',
  'CONSTRUCCION', 'CONSTRUCCIÓN', 'CONSTRUCTORA', 'CONSULTORIA', 'CONSULTORÍA',
  'CORPORACION', 'CORPORACIÓN', 'DISTRIBUIDORA', 'DISTRIBUCION', 'DISTRIBUCIÓN',
  'EDITORA', 'EMPRESA', 'EMPRESARIAL', 'ENLACES', 'EXPORTADORA', 'FINANCIERA',
  'GLOBAL', 'GRUPO', 'HOLDING', 'IMPORTADORA', 'IMPRESORA', 'INDUSTRIA', 'INDUSTRIAL',
  'INMOBILIARIA', 'INSTITUTO', 'INTEGRAL', 'INTERNACIONAL', 'INVERSIONES', 'LOGISTICA',
  'LOGÍSTICA', 'MANUFACTURERA', 'MATERIALES', 'MEXICANA', 'MEXICANO', 'MEXICANOS',
  'NACIONAL', 'OPERADORA', 'PRODUCTOS', 'PROMOTORA', 'PROVEEDORA', 'RADIO',
  'RADIODIFUSORA', 'RESTAURANTE', 'RESTAURANTES', 'SERVICIO', 'SERVICIOS', 'SISTEMAS',
  'SOCIEDAD', 'SOLUCIONES', 'TECNOLOGIA', 'TECNOLOGÍA', 'TELECOMUNICACIONES',
  'TRANSPORTES', 'UNION', 'UNIÓN', 'VENTAS',
]);

function separarPalabras(texto: string): string {
  if (!texto || texto.includes(' ')) return texto;

  const n = texto.length;
  const dp: (string[] | null)[] = new Array(n + 1).fill(null);
  dp[0] = [];

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] !== null) {
        const palabra = texto.slice(j, i);
        if (PALABRAS_CALLE.has(palabra)) {
          if (dp[i] === null || dp[i]!.length > dp[j]!.length + 1) {
            dp[i] = [...dp[j]!, palabra];
          }
        }
      }
    }
  }

  if (dp[n] !== null) return dp[n]!.join(' ');

  // Segmentación parcial: separar lo que se pueda desde el inicio
  let mejorFin = 0;
  let mejorPalabras: string[] = [];
  for (let i = n; i >= 1; i--) {
    if (dp[i] !== null) {
      mejorFin = i;
      mejorPalabras = dp[i]!;
      break;
    }
  }

  if (mejorFin > 0 && mejorFin < n) {
    return [...mejorPalabras, texto.slice(mejorFin)].join(' ');
  }

  return texto;
}

function separarPalabrasConDiccionario(texto: string, diccionario: Set<string>): string {
  if (!texto || texto.includes(' ')) return texto;

  const n = texto.length;
  const dp: (string[] | null)[] = new Array(n + 1).fill(null);
  dp[0] = [];

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] !== null) {
        const palabra = texto.slice(j, i);
        if (diccionario.has(palabra)) {
          const candidate = [...dp[j]!, palabra];
          if (dp[i] === null || candidate.length < dp[i]!.length) {
            dp[i] = candidate;
          }
        }
      }
    }
  }

  return dp[n]?.join(' ') || texto;
}

function normalizarRazonSocial(value: string): string {
  const upper = value.toUpperCase().trim();
  if (!upper || upper.includes(' ')) return upper;
  return separarPalabrasConDiccionario(upper, PALABRAS_RAZON_SOCIAL);
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanExtractedValue(value: string): string {
  return value
    .replace(/^[:\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCsfLabelValue(value: string): boolean {
  const compact = compactForSearch(value);
  if (!compact) return false;
  return CSF_STOP_LABELS.some((label) => {
    const labelCompact = compactForSearch(label);
    return compact === labelCompact || labelCompact.startsWith(compact) || compact.startsWith(labelCompact);
  });
}

function cleanOptionalField(value: string): string {
  const cleaned = cleanExtractedValue(value);
  return isCsfLabelValue(cleaned) ? '' : cleaned;
}

function compactForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ&]/g, '');
}

const CSF_STOP_LABELS = [
  'Registro Federal de Contribuyentes',
  'Denominación/Razón Social',
  'Denominacion/Razon Social',
  'Nombre (s)',
  'Nombre(s)',
  'Nombres',
  'Primer Apellido',
  'Segundo Apellido',
  'Nombre Comercial',
  'Nombre de Vialidad',
  'NombredeVialidad',
  'Número Exterior',
  'Numero Exterior',
  'NúmeroExterior',
  'NumeroExterior',
  'Número Interior',
  'Numero Interior',
  'NúmeroInterior',
  'NumeroInterior',
  'Nombre de la Colonia',
  'NombredelaColonia',
  'Nombre de la Localidad',
  'NombredelaLocalidad',
  'Nombre del Municipio o Demarcación Territorial',
  'Nombre del Municipio',
  'NombredelMunicipiooDemarcacionTerritorial',
  'NombredelMunicipio',
  'Nombre de la Entidad Federativa',
  'NombredelaEntidadFederativa',
  'Código Postal',
  'Codigo Postal',
  'CodigoPostal',
  'C.P.',
  'Tipo de Vialidad',
  'TipodeVialidad',
  'Tipo de Asentamiento',
  'TipodeAsentamiento',
  'Entre Calle',
  'Y Calle',
  'Actividad Económica',
  'Actividad Economica',
  'Régimen',
  'Regimen',
  'Fecha de Alta',
  'Fecha Inicio de operaciones',
  'Situación del Contribuyente',
  'Situacion del Contribuyente',
];

function labelToPattern(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\ /g, '\\s*')
    .replace(/\\\//g, '\\s*\\/\\s*');
}

const CSF_STOP_PATTERN = CSF_STOP_LABELS
  .map(labelToPattern)
  .sort((a, b) => b.length - a.length)
  .join('|');

type CompactTextIndex = {
  text: string;
  map: number[];
};

function buildCompactTextIndex(value: string): CompactTextIndex {
  const textParts: string[] = [];
  const map: number[] = [];

  for (let i = 0; i < value.length; i++) {
    const normalized = value[i].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/^[A-Z0-9Ñ&]$/.test(normalized)) {
      textParts.push(normalized);
      map.push(i);
    }
  }

  return { text: textParts.join(''), map };
}

function getCompactBlock(rawText: string, compactIndex: CompactTextIndex, labels: string[]): string {
  const labelCandidates = labels
    .map(compactForSearch)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const stopCandidates = CSF_STOP_LABELS
    .map(compactForSearch)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const label of labelCandidates) {
    const labelPos = compactIndex.text.indexOf(label);
    if (labelPos < 0) continue;

    const valueStart = labelPos + label.length;
    let valueEnd = compactIndex.text.length;

    for (const stop of stopCandidates) {
      if (stop === label) continue;
      const stopPos = compactIndex.text.indexOf(stop, valueStart);
      if (stopPos >= 0 && stopPos < valueEnd) {
        valueEnd = stopPos;
      }
    }

    const startOriginal = compactIndex.map[valueStart] ?? rawText.length;
    const endOriginal = compactIndex.map[valueEnd] ?? rawText.length;
    const value = cleanExtractedValue(rawText.slice(startOriginal, endOriginal));
    if (value) return value;
  }

  return '';
}

function getBlock(textNorm: string, labels: string[]): string {
  for (const label of labels) {
    const labelPattern = labelToPattern(label);
    const match = textNorm.match(
      new RegExp(`(?:^|\\s)${labelPattern}\\s*:?\\s*([\\s\\S]*?)(?=\\s*(?:${CSF_STOP_PATTERN})\\s*:?\\s|$)`, 'i')
    );
    const value = cleanExtractedValue(match?.[1] || '');
    if (value) return value;
  }
  return '';
}

function getCsfBlock(rawText: string, textNorm: string, compactIndex: CompactTextIndex, labels: string[]): string {
  return getCompactBlock(rawText, compactIndex, labels) || getBlock(textNorm, labels);
}

function onlyFirstToken(value: string): string {
  return (value || '').split(/\s+/)[0]?.trim() || '';
}

function firstPostalCode(value: string): string {
  return (value.match(/\b\d{5}\b/) || [])[0] || '';
}

function estadoDesdeTexto(value: string): string {
  const cleaned = cleanExtractedValue(value)
    .replace(/\bA\s+\d{1,2}\s+DE\s+[A-Z]+\b.*$/i, '')
    .trim();
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('csf') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo CSF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);

    const text = String(data?.text || '')
      .replace(/\r/g, '')
      .replace(/\|/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .replace(/\n{3,}/g, '\n\n');
    const textNormSearch = normalizeForSearch(text);
    const compactIndex = buildCompactTextIndex(text);

    console.log('📄 Texto CSF raw (3000):\n', text.substring(0, 3000));

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getNextLine = (label: string): string => {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const clean = lines[i].replace(/\s/g, '').toLowerCase();
        const labelClean = label.replace(/\s/g, '').toLowerCase();
        if (clean === labelClean || clean === labelClean + ':') {
          for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j].trim();
            if (next) return next;
          }
        }
      }
      return '';
    };

    const getSameLine = (label: string): string => {
      const labelClean = label.replace(/\s/g, '').toLowerCase();
      const lines = text.split('\n');
      for (const line of lines) {
        const lineClean = line.replace(/\s/g, '').toLowerCase();
        if (lineClean.startsWith(labelClean + ':')) {
          return line.slice(line.indexOf(':') + 1).trim();
        }
      }
      return '';
    };

    const get = (label: string): string => getSameLine(label) || getNextLine(label);

    const getFlexible = (...labels: string[]): string => {
      for (const label of labels) {
        const same = getSameLine(label);
        if (same) return same;

        const next = getNextLine(label);
        if (next) return next;
      }
      return '';
    };

    // ── RFC ───────────────────────────────────────────────────────────────────
    const rfc = (
      (text.match(/\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/i) || [])[1] ||
      getCsfBlock(text, textNormSearch, compactIndex, ['RFC']) ||
      get('RFC') ||
      ''
    ).toUpperCase().trim();

    // ── Nombre / Razón Social ─────────────────────────────────────────────────
    let nombreRazonSocial = '';

    const encabezadoMatch =
      text.match(/Registro Federal de Contribuyentes\s*\n([\s\S]*?)\nNombre,/i);
    const nombreDesdeEncabezado = encabezadoMatch
      ? encabezadoMatch[1]
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(' ')
      : '';

    const razonSocial =
      nombreDesdeEncabezado ||
      getCsfBlock(text, textNormSearch, compactIndex, [
        'Denominación/Razón Social',
        'Denominacion/Razon Social',
        'DenominaciónRazónSocial',
        'DenominacionRazonSocial',
      ]) ||
      get('Denominación/Razón Social') ||
      get('Denominacion/Razon Social') ||
      get('DenominaciónRazónSocial') ||
      get('DenominacionRazonSocial');

    if (razonSocial && razonSocial.length > 1) {
      nombreRazonSocial = normalizarRazonSocial(razonSocial);
    } else {
      if (!nombreRazonSocial) {
        const nombres =
          getCsfBlock(text, textNormSearch, compactIndex, ['Nombre (s)', 'Nombre(s)', 'Nombres']) ||
          get('Nombre (s)') ||
          get('Nombre(s)') ||
          get('Nombres');
        const apellido1 =
          getCsfBlock(text, textNormSearch, compactIndex, ['Primer Apellido', 'PrimerApellido']) ||
          get('Primer Apellido') ||
          get('PrimerApellido');
        const apellido2 =
          getCsfBlock(text, textNormSearch, compactIndex, ['Segundo Apellido', 'SegundoApellido']) ||
          get('Segundo Apellido') ||
          get('SegundoApellido');
        if (nombres || apellido1) {
          nombreRazonSocial = normalizarRazonSocial([nombres, apellido1, apellido2]
            .map((s: string) => (s || '').trim())
            .filter(Boolean)
            .join(' '));
        }
      }

      if (!nombreRazonSocial) {
        const nombreComercial =
          getCsfBlock(text, textNormSearch, compactIndex, ['Nombre Comercial', 'NombreComercial']) ||
          get('Nombre Comercial') ||
          get('NombreComercial');
        if (nombreComercial && nombreComercial.length > 3) {
          nombreRazonSocial = normalizarRazonSocial(nombreComercial);
        }
      }
    }

    // ── Código Postal ─────────────────────────────────────────────────────────
    const cp =
      firstPostalCode(
        getCsfBlock(text, textNormSearch, compactIndex, ['Código Postal', 'Codigo Postal', 'CodigoPostal', 'C.P.']) ||
        get('Código Postal') ||
        get('Codigo Postal') ||
        get('CodigoPostal') ||
        get('C.P.') ||
        (text.match(/(?:Código|Codigo|C\.P\.)Postal[:\s]*(\d{5})/i) || [])[1] ||
        ''
      );

    // ── Calle ─────────────────────────────────────────────────────────────────
    // Extraer valor crudo del bloque comprimido con lookahead
    const calleMatch =
      text.match(/NombredeVialidad[:\s]*(.*?)(?=N[uú]meroExterior|$)/im) ||
      text.match(/Nombre\s*de\s*Vialidad[:\s]*(.*?)(?=N[uú]mero\s*Exterior|$)/im);
    const calleRaw = (
      getCsfBlock(text, textNormSearch, compactIndex, ['Nombre de Vialidad', 'NombredeVialidad']) ||
      calleMatch?.[1]?.trim() ||
      ''
    ).toUpperCase().trim();

    // ✅ Aplicar word segmentation si viene sin espacios (igual que el nombre)
    const calle = separarPalabras(cleanOptionalField(calleRaw));

    // ── Número Exterior ───────────────────────────────────────────────────────
    const numExteriorMatch =
      text.match(/N[uú]meroExterior[:\s]*([^\sN\n][^\s\n]*)/i) ||
      text.match(/N[uú]mero\s*Exterior[:\s]*([^\s\n]+)/i);
    const numExteriorRaw =
      getCsfBlock(text, textNormSearch, compactIndex, ['Número Exterior', 'Numero Exterior', 'NúmeroExterior', 'NumeroExterior']) ||
      numExteriorMatch?.[1]?.trim() ||
      getSameLine('NúmeroExterior') ||
      getSameLine('NumeroExterior') ||
      getSameLine('Número Exterior') ||
      getNextLine('NúmeroExterior') ||
      getNextLine('NumeroExterior') ||
      getNextLine('Número Exterior');
    const numExterior = onlyFirstToken(cleanOptionalField(numExteriorRaw));

    // ── Número Interior ───────────────────────────────────────────────────────
    const numInterior = onlyFirstToken(cleanOptionalField(
      getCsfBlock(text, textNormSearch, compactIndex, ['Número Interior', 'Numero Interior', 'NúmeroInterior', 'NumeroInterior']) ||
      getSameLine('NúmeroInterior') ||
      getSameLine('NumeroInterior') ||
      getSameLine('Número Interior') ||
      getNextLine('NúmeroInterior') ||
      getNextLine('NumeroInterior') ||
      getNextLine('Número Interior')
    ));

    // ── Colonia ───────────────────────────────────────────────────────────────
    const coloniaRaw =
      getCsfBlock(text, textNormSearch, compactIndex, [
        'Nombre de la Colonia',
        'NombredelaColonia',
        'Nombre dela Colonia',
        'Colonia',
        'Colonia / Fracción',
        'Colonia o Fracción',
      ]) ||
      getFlexible(
        'NombredelaColonia',
        'Nombre de la Colonia',
        'Nombre dela Colonia',
        'Colonia',
        'Colonia / Fracción',
        'Colonia o Fracción'
      ) ||
      (text.match(/Colonia[:\s]*([^\n]+)/i)?.[1] || '');
    const colonia = cleanOptionalField(coloniaRaw || '').toUpperCase().trim();

    // ── Municipio ─────────────────────────────────────────────────────────────
    // Primero buscar en encabezado visual: "PACHUCA DE SOTO , HIDALGO"
    const encabezadoLugar = text.match(
      /Lugar y Fecha de Emisión\s*\n([^\n]+)/i
    );
    const municipioDesdeEncabezado = encabezadoLugar
      ? (encabezadoLugar[1].split(',')[0] || '').trim().toUpperCase()
      : '';

    // Fallback: bloque comprimido partido en 2 líneas
    const municipioLineMatch = text.match(
      /NombredelMunicipio[^:\n]*[:\s]*([^\n]+)\n([^\n]+?)(?=\nNombre|\n\n|$)/i
    );
    const municipioComprimido =
      getCsfBlock(text, textNormSearch, compactIndex, [
        'Nombre del Municipio o Demarcación Territorial',
        'Nombre del Municipio',
        'NombredelMunicipiooDemarcacionTerritorial',
        'NombredelMunicipio',
        'Nombre de la Localidad',
        'NombredelaLocalidad',
      ]) ||
      (
        municipioLineMatch
          ? (municipioLineMatch[1].trim() + ' ' + municipioLineMatch[2].trim()).trim()
          : (
            getSameLine('NombredelMunicipiooDemar') ||
            getSameLine('Nombre del Municipio') ||
            getSameLine('NombredelaLocalidad') ||
            getSameLine('Nombre de la Localidad') ||
            getNextLine('NombredelaLocalidad') ||
            getNextLine('Nombre de la Localidad')
          )
      );

    const municipioRaw = municipioComprimido || municipioDesdeEncabezado;
    const municipio = municipioRaw
      .replace(/NombredelMunicipio.*/i, '')
      .toUpperCase()
      .trim();

    // ── Estado ────────────────────────────────────────────────────────────────
    // Encabezado visual: "PACHUCA DE SOTO , HIDALGO A 30 DE OCTUBRE"
    const estadoDesdeEncabezado = encabezadoLugar
      ? estadoDesdeTexto((encabezadoLugar[1].split(',')[1] || '').trim()).toUpperCase()
      : '';

    const estadoComprimidoRaw =
      getCsfBlock(text, textNormSearch, compactIndex, ['Nombre de la Entidad Federativa', 'NombredelaEntidadFederativa']) ||
      getSameLine('NombredelaEntidadFederativa') ||
      getSameLine('Nombre de la Entidad Federativa') ||
      getNextLine('NombredelaEntidadFederativa') ||
      getNextLine('Nombre de la Entidad Federativa') ||
      (text.match(/NombredelaEntidadFederativa[:\s]*([A-ZÁÉÍÓÚÑ]+)/i))?.[1] || '';

    const estadoRaw = estadoComprimidoRaw || estadoDesdeEncabezado;
    const estado = estadoRaw
      .replace(/EntreCalle.*/i, '')
      .replace(/Entre\s+Calle.*/i, '')
      .replace(/Calle:.*/i, '')
      .toUpperCase()
      .trim();

    // ── Régimen Fiscal ────────────────────────────────────────────────────────
    const REGIMEN_MAP: Record<string, string> = {
      'General de Ley Personas Morales': '601',
      'Personas Morales con Fines no Lucrativos': '603',
      'Sueldos y Salarios e Ingresos Asimilados a Salarios': '605',
      'Sueldos y Salarios e Ingresos Asimilados': '605',
      'Arrendamiento': '606',
      'Régimen de Enajenación o Adquisición de Bienes': '607',
      'Demás ingresos': '608',
      'Actividades Empresariales y Profesionales': '612',
      'Residentes en el Extranjero': '610',
      'Ingresos por Dividendos': '611',
      'Ingresos por intereses': '614',
      'Régimen de los ingresos por obtención de premios': '615',
      'Sin obligaciones fiscales': '616',
      'Sociedades Cooperativas de Producción que optan por diferir sus ingresos': '620',
      'Incorporación Fiscal': '621',
      'Regimen de Incorporacion Fiscal': '621',
      'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras': '622',
      'Opcional para Grupos de Sociedades': '623',
      'Coordinados': '624',
      'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas': '625',
      'Régimen Simplificado de Confianza': '626',
    };

    let regimenFiscal = '';
    const regimenBlock = getCsfBlock(text, textNormSearch, compactIndex, ['Régimen', 'Regimen']);
    const regimenCode = (regimenBlock.match(/\b(601|603|605|606|607|608|610|611|612|614|615|616|620|621|622|623|624|625|626)\b/) || [])[1];
    if (regimenCode) {
      regimenFiscal = regimenCode;
    } else {
      const regimenSearchTexts = [regimenBlock, text];
      for (const [desc, clave] of Object.entries(REGIMEN_MAP)) {
        const descNorm = normalizeForSearch(desc);
        if (regimenSearchTexts.some((item) => item.includes(desc) || normalizeForSearch(item).includes(descNorm))) {
          regimenFiscal = clave;
          break;
        }
      }
    }

    // ── Resultado ─────────────────────────────────────────────────────────────
    const result = {
      rfc,
      nombreRazonSocial,
      regimenFiscal,
      cp,
      calle,
      numExterior,
      numInterior,
      colonia,
      municipio,
      estado,
      pais: 'MEXICO',
    };

    console.log('✅ CSF parseada:', result);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Error parseando CSF:', error);
    return NextResponse.json({ error: 'No se pudo leer la CSF' }, { status: 500 });
  }
}
