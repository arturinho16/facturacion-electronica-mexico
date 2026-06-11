import {
  DEDUCCIONES_REQUIEREN_INCAPACIDAD,
  OTROS_PAGOS_REQUIEREN_COMPENSACION,
  OTROS_PAGOS_REQUIEREN_SUBSIDIO,
  PERCEPCIONES_JUBILACION_RETIRO,
  PERCEPCIONES_REQUIEREN_HORAS_EXTRA,
  PERCEPCIONES_REQUIEREN_INCAPACIDAD,
  PERCEPCIONES_SEPARACION_INDEMNIZACION,
  periodicidadCompatibleConTipoNomina,
  regimenCompatibleConTipoContrato,
  tipoContratoRequiereRegistroPatronal,
} from '@/lib/nomina/reglas-sat';

export interface ErrorValidacion { codigo: string; mensaje: string; }

export function validarXMLNomina(xml: string): ErrorValidacion[] {
  const errs: ErrorValidacion[] = [];
  const attr = (re: RegExp) => xml.match(re)?.[1];
  const attrIn = (node: string, name: string) => node.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  const getNodes = (tag: string) => Array.from(xml.matchAll(new RegExp(`<${tag}\\b[^>]*(?:/>|>[\\s\\S]*?</${tag}>)`, 'g'))).map((match) => match[0]);
  const getNode = (tag: string) => getNodes(tag)[0] || '';
  const money = (value?: string) => parseFloat(value || '0');
  const hasAttr = (name: string) => new RegExp(`\\s${name}="`).test(xml);
  const hasNode = (tag: string) => new RegExp(`<${tag}\\b`).test(xml);

  const version = attr(/\sVersion="([^"]+)"/) ?? '';
  const tipoNomina = attr(/\sTipoNomina="([^"]+)"/) ?? '';
  const usoCfdi = attr(/\sUsoCFDI="([^"]+)"/) ?? '';
  const regimenFiscalReceptor = attr(/\sRegimenFiscalReceptor="([^"]+)"/) ?? '';
  const moneda = attr(/\sMoneda="([^"]+)"/) ?? '';
  const tipoComprobante = attr(/\sTipoDeComprobante="([^"]+)"/) ?? '';
  const exportacion = attr(/\sExportacion="([^"]+)"/) ?? '';
  const metodoPago = attr(/\sMetodoPago="([^"]+)"/) ?? '';
  const lugarExpedicion = attr(/\sLugarExpedicion="([^"]+)"/) ?? '';
  const domicilioFiscalReceptor = attr(/\sDomicilioFiscalReceptor="([^"]+)"/) ?? '';
  const subTotal = parseFloat(attr(/\sSubTotal="([^"]+)"/) ?? "0");
  const total = parseFloat(attr(/\sTotal="([^"]+)"/) ?? "0");
  const descuento = parseFloat(attr(/\sDescuento="([^"]+)"/) ?? "0");
  const totalPer = parseFloat(attr(/TotalPercepciones="([^"]+)"/) ?? "0");
  const totalDed = parseFloat(attr(/TotalDeducciones="([^"]+)"/) ?? "0");
  const totalOP = parseFloat(attr(/TotalOtrosPagos="([^"]+)"/) ?? "0");
  const totalSueldos = parseFloat(attr(/TotalSueldos="([^"]+)"/) ?? "0");
  const totalSeparacionIndemnizacion = parseFloat(attr(/TotalSeparacionIndemnizacion="([^"]+)"/) ?? "0");
  const totalJubilacionPensionRetiro = parseFloat(attr(/TotalJubilacionPensionRetiro="([^"]+)"/) ?? "0");
  const totalGravado = parseFloat(attr(/TotalGravado="([^"]+)"/) ?? "0");
  const totalExento = parseFloat(attr(/TotalExento="([^"]+)"/) ?? "0");
  const totalOtrasDeducciones = parseFloat(attr(/TotalOtrasDeducciones="([^"]+)"/) ?? "0");
  const totalImpuestosRetenidos = parseFloat(attr(/TotalImpuestosRetenidos="([^"]+)"/) ?? "0");
  const fechaPago = attr(/FechaPago="([^"]+)"/) ?? "";
  const fechaInicialPago = attr(/FechaInicialPago="([^"]+)"/) ?? "";
  const fechaFinalPago = attr(/FechaFinalPago="([^"]+)"/) ?? "";
  const numDiasPagados = parseFloat(attr(/NumDiasPagados="([^"]+)"/) ?? "0");
  const fechaIniRel = attr(/FechaInicioRelLaboral="([^"]+)"/);
  const curp = attr(/\sCurp="([^"]+)"/);
  const nss = attr(/\sNumSeguridadSocial="([^"]+)"/);
  const tipoContrato = attr(/\sTipoContrato="([^"]+)"/);
  const tipoRegimen = attr(/\sTipoRegimen="([^"]+)"/);
  const numEmpleado = attr(/\sNumEmpleado="([^"]+)"/);
  const periodicidadPago = attr(/\sPeriodicidadPago="([^"]+)"/);
  const claveEntFed = attr(/\sClaveEntFed="([^"]+)"/);
  const registroPatronal = attr(/\sRegistroPatronal="([^"]+)"/);
  const riesgoPuesto = attr(/\sRiesgoPuesto="([^"]+)"/);
  const antiguedad = attr(/\sAntigüedad="([^"]+)"/);
  const salarioBaseCotApor = attr(/\sSalarioBaseCotApor="([^"]+)"/);
  const salarioDiarioIntegrado = attr(/\sSalarioDiarioIntegrado="([^"]+)"/);
  const cuentaBancaria = attr(/\sCuentaBancaria="([^"]+)"/);
  const banco = attr(/\sBanco="([^"]+)"/);
  const conceptoCfdi = getNode('cfdi:Concepto');
  const percepciones = getNodes('nomina12:Percepcion');
  const deducciones = getNodes('nomina12:Deduccion');
  const otrosPagos = getNodes('nomina12:OtroPago');
  const incapacidades = getNodes('nomina12:Incapacidad');

  const r = (a: number, b: number) => Math.abs(a - b) < 0.01;
  const registroPatronalInvalido = registroPatronal
    ? ['0', 'N/A', 'NA', 'SIN REGISTRO', 'SIN_REGISTRO'].includes(registroPatronal.trim().toUpperCase())
    : false;
  const registroPatronalValido = !!registroPatronal && !registroPatronalInvalido;
  const requiereRegistroPatronal = tipoContratoRequiereRegistroPatronal(tipoContrato);
  const entidadesSat = new Set([
    'AGU', 'BCN', 'BCS', 'CAM', 'CHP', 'CHH', 'CMX', 'COA', 'COL', 'DUR', 'GUA', 'GRO',
    'HID', 'JAL', 'MEX', 'MIC', 'MOR', 'NAY', 'NLE', 'OAX', 'PUE', 'QUE', 'ROO', 'SLP',
    'SIN', 'SON', 'TAB', 'TAM', 'TLA', 'VER', 'YUC', 'ZAC',
  ]);

  if (version !== '4.0') errs.push({ codigo: 'CFDI', mensaje: 'El CFDI debe ser versión 4.0.' });
  if (tipoNomina !== 'O' && tipoNomina !== 'E') errs.push({ codigo: 'NOM', mensaje: 'TipoNomina debe ser O o E.' });
  if (usoCfdi !== 'CN01') errs.push({ codigo: 'CFDI', mensaje: 'UsoCFDI debe ser CN01.' });
  if (regimenFiscalReceptor !== '605') errs.push({ codigo: 'CFDI', mensaje: 'RegimenFiscalReceptor debe ser 605.' });
  if (moneda !== 'MXN') errs.push({ codigo: 'CFDI', mensaje: 'Moneda debe ser MXN en CFDI de nómina.' });
  if (tipoComprobante !== 'N') errs.push({ codigo: 'CFDI', mensaje: 'TipoDeComprobante debe ser N.' });
  if (exportacion !== '01') errs.push({ codigo: 'CFDI', mensaje: 'Exportacion debe ser 01.' });
  if (metodoPago !== 'PUE') errs.push({ codigo: 'CFDI', mensaje: 'MetodoPago debe ser PUE.' });
  if (!/^\d{5}$/.test(lugarExpedicion)) errs.push({ codigo: 'CFDI', mensaje: 'LugarExpedicion debe ser un código postal de 5 dígitos.' });
  if (!domicilioFiscalReceptor) errs.push({ codigo: 'CFDI', mensaje: 'DomicilioFiscalReceptor es obligatorio.' });
  if (!curp) errs.push({ codigo: 'NOM', mensaje: 'Falta CURP del receptor de nómina.' });
  if (!tipoContrato) errs.push({ codigo: 'NOM', mensaje: 'Falta TipoContrato.' });
  if (!tipoRegimen) errs.push({ codigo: 'NOM', mensaje: 'Falta TipoRegimen.' });
  if (!numEmpleado) errs.push({ codigo: 'NOM', mensaje: 'Falta NumEmpleado.' });
  if (!periodicidadPago) errs.push({ codigo: 'NOM', mensaje: 'Falta PeriodicidadPago.' });
  if (!claveEntFed) errs.push({ codigo: 'NOM', mensaje: 'Falta ClaveEntFed.' });
  if (!fechaPago) errs.push({ codigo: 'NOM', mensaje: 'Falta FechaPago.' });
  if (!fechaInicialPago) errs.push({ codigo: 'NOM', mensaje: 'Falta FechaInicialPago.' });
  if (!fechaFinalPago) errs.push({ codigo: 'NOM', mensaje: 'Falta FechaFinalPago.' });
  if (numDiasPagados <= 0) errs.push({ codigo: 'NOM', mensaje: 'NumDiasPagados debe ser mayor a cero.' });
  if (numDiasPagados > 36160) errs.push({ codigo: 'NOM', mensaje: 'NumDiasPagados no puede exceder 36,160 días.' });
  if (!/^\d+(\.\d{1,3})?$/.test(attr(/NumDiasPagados="([^"]+)"/) || ''))
    errs.push({ codigo: 'NOM', mensaje: 'NumDiasPagados debe tener máximo 3 decimales.' });

  if (hasAttr('FormaPago')) errs.push({ codigo: 'CFDI', mensaje: 'FormaPago no debe existir en CFDI de nómina.' });
  if (hasAttr('CondicionesDePago')) errs.push({ codigo: 'CFDI', mensaje: 'CondicionesDePago no debe existir en CFDI de nómina.' });
  if (hasAttr('TipoCambio')) errs.push({ codigo: 'CFDI', mensaje: 'TipoCambio no debe existir en CFDI de nómina.' });
  if (hasNode('cfdi:InformacionGlobal')) errs.push({ codigo: 'CFDI', mensaje: 'InformacionGlobal no debe existir en CFDI de nómina.' });
  if (hasAttr('ResidenciaFiscal')) errs.push({ codigo: 'CFDI', mensaje: 'ResidenciaFiscal no debe existir para receptor de nómina.' });
  if (hasAttr('NumRegIdTrib')) errs.push({ codigo: 'CFDI', mensaje: 'NumRegIdTrib no debe existir para receptor de nómina.' });
  if (hasAttr('FacAtrAdquirente')) errs.push({ codigo: 'CFDI', mensaje: 'FacAtrAdquirente no debe existir en el emisor de nómina.' });

  if (fechaInicialPago && fechaFinalPago && fechaInicialPago > fechaFinalPago)
    errs.push({ codigo: 'NOM', mensaje: 'FechaInicialPago no puede ser posterior a FechaFinalPago.' });
  if (fechaFinalPago && fechaPago && fechaFinalPago > fechaPago)
    errs.push({ codigo: 'NOM', mensaje: 'FechaFinalPago no puede ser posterior a FechaPago.' });

  if (!periodicidadCompatibleConTipoNomina(tipoNomina, periodicidadPago)) {
    errs.push({
      codigo: 'NOM',
      mensaje: tipoNomina === 'O'
        ? 'Si TipoNomina es O, PeriodicidadPago debe ser 01 a 10; no debe ser 99.'
        : 'Si TipoNomina es E, PeriodicidadPago debe ser 99.',
    });
  }

  if (claveEntFed && !entidadesSat.has(claveEntFed))
    errs.push({ codigo: 'NOM', mensaje: `ClaveEntFed ${claveEntFed} no pertenece al catálogo SAT.` });

  if (getNodes('cfdi:Concepto').length !== 1)
    errs.push({ codigo: 'CFDI', mensaje: 'El CFDI de nómina debe tener exactamente un concepto.' });
  if (conceptoCfdi) {
    if (attrIn(conceptoCfdi, 'ClaveProdServ') !== '84111505') errs.push({ codigo: 'CFDI', mensaje: 'ClaveProdServ del concepto debe ser 84111505.' });
    if (attrIn(conceptoCfdi, 'Cantidad') !== '1') errs.push({ codigo: 'CFDI', mensaje: 'Cantidad del concepto debe ser 1.' });
    if (attrIn(conceptoCfdi, 'ClaveUnidad') !== 'ACT') errs.push({ codigo: 'CFDI', mensaje: 'ClaveUnidad del concepto debe ser ACT.' });
    if (attrIn(conceptoCfdi, 'Descripcion') !== 'Pago de nómina') errs.push({ codigo: 'CFDI', mensaje: 'Descripcion del concepto debe ser Pago de nómina.' });
    if (attrIn(conceptoCfdi, 'ObjetoImp') !== '01') errs.push({ codigo: 'CFDI', mensaje: 'ObjetoImp del concepto debe ser 01.' });
    if (attrIn(conceptoCfdi, 'NoIdentificacion')) errs.push({ codigo: 'CFDI', mensaje: 'NoIdentificacion no debe existir en el concepto de nómina.' });
    if (attrIn(conceptoCfdi, 'Unidad')) errs.push({ codigo: 'CFDI', mensaje: 'Unidad no debe existir en el concepto de nómina.' });
    if (/<cfdi:Concepto\b[\s\S]*<cfdi:Impuestos\b/.test(conceptoCfdi)) errs.push({ codigo: 'CFDI', mensaje: 'El nodo Impuestos no debe existir dentro del concepto de nómina.' });
    if (!r(money(attrIn(conceptoCfdi, 'ValorUnitario')), totalPer + totalOP))
      errs.push({ codigo: 'CFDI', mensaje: 'ValorUnitario del concepto debe ser TotalPercepciones + TotalOtrosPagos.' });
    if (!r(money(attrIn(conceptoCfdi, 'Importe')), totalPer + totalOP))
      errs.push({ codigo: 'CFDI', mensaje: 'Importe del concepto debe ser TotalPercepciones + TotalOtrosPagos.' });
    if (totalDed > 0 && !r(money(attrIn(conceptoCfdi, 'Descuento')), totalDed))
      errs.push({ codigo: 'CFDI', mensaje: 'Descuento del concepto debe ser igual a TotalDeducciones.' });
    if (totalDed === 0 && attrIn(conceptoCfdi, 'Descuento'))
      errs.push({ codigo: 'CFDI', mensaje: 'Descuento del concepto no debe existir si no hay deducciones.' });
  }

  if (tipoContrato && tipoRegimen && !regimenCompatibleConTipoContrato(tipoContrato, tipoRegimen)) {
    errs.push({
      codigo: 'NOM',
      mensaje: requiereRegistroPatronal
        ? 'Si TipoContrato está entre 01 y 08, TipoRegimen debe ser 02, 03 o 04.'
        : 'Si TipoContrato es 09 o superior, TipoRegimen debe estar entre 05 y 99.',
    });
  }

  if (requiereRegistroPatronal && !registroPatronalValido) {
    errs.push({
      codigo: 'NOM42',
      mensaje: 'El atributo Nomina.Emisor.RegistroPatronal se debe registrar cuando TipoContrato es 01, 02, 03, 04, 05, 06, 07 u 08.',
    });
  }

  if (registroPatronal && (registroPatronal.length < 1 || registroPatronal.length > 20))
    errs.push({ codigo: 'NOM', mensaje: 'RegistroPatronal debe tener de 1 a 20 caracteres.' });
  if (numEmpleado && (numEmpleado.length < 1 || numEmpleado.length > 15))
    errs.push({ codigo: 'NOM', mensaje: 'NumEmpleado debe tener de 1 a 15 caracteres.' });

  if (registroPatronalValido) {
    if (!nss) errs.push({ codigo: 'NOM', mensaje: 'NumSeguridadSocial es requerido cuando existe RegistroPatronal.' });
    if (nss && !/^\d{1,15}$/.test(nss)) errs.push({ codigo: 'NOM', mensaje: 'NumSeguridadSocial debe tener de 1 a 15 dígitos.' });
    if (!fechaIniRel) errs.push({ codigo: 'NOM', mensaje: 'FechaInicioRelLaboral es requerida cuando existe RegistroPatronal.' });
    if (!antiguedad) errs.push({ codigo: 'NOM', mensaje: 'Antigüedad es requerida cuando existe RegistroPatronal.' });
    if (!riesgoPuesto) errs.push({ codigo: 'NOM', mensaje: 'RiesgoPuesto es requerido cuando existe RegistroPatronal.' });
    if (!salarioBaseCotApor) errs.push({ codigo: 'NOM', mensaje: 'SalarioBaseCotApor es requerido cuando existe RegistroPatronal.' });
    if (!salarioDiarioIntegrado) errs.push({ codigo: 'NOM', mensaje: 'SalarioDiarioIntegrado es requerido cuando existe RegistroPatronal.' });
  } else {
    const camposLaborales = [
      ['NumSeguridadSocial', nss],
      ['FechaInicioRelLaboral', fechaIniRel],
      ['Antigüedad', antiguedad],
      ['RiesgoPuesto', riesgoPuesto],
      ['SalarioBaseCotApor', salarioBaseCotApor],
      ['SalarioDiarioIntegrado', salarioDiarioIntegrado],
    ];
    for (const [campo, value] of camposLaborales) {
      if (value) errs.push({ codigo: 'NOM', mensaje: `${campo} no debe existir cuando no se registra RegistroPatronal.` });
    }
  }

  if (registroPatronalInvalido)
    errs.push({ codigo: 'NOM', mensaje: 'RegistroPatronal inválido; captura uno real o deja el campo vacío para pruebas.' });

  if (cuentaBancaria && !/^(\d{10}|\d{11}|\d{15}|\d{16}|\d{18})$/.test(cuentaBancaria))
    errs.push({ codigo: 'NOM', mensaje: 'CuentaBancaria debe tener 10, 11, 15, 16 o 18 dígitos.' });
  if (cuentaBancaria && cuentaBancaria.length === 18 && banco)
    errs.push({ codigo: 'NOM', mensaje: 'Banco no debe existir cuando CuentaBancaria es CLABE de 18 dígitos.' });
  if (cuentaBancaria && ['10', '11', '16'].includes(String(cuentaBancaria.length)) && !banco)
    errs.push({ codigo: 'NOM', mensaje: 'Banco debe existir cuando CuentaBancaria tiene 10, 11 o 16 dígitos.' });

  if (!r(subTotal, totalPer + totalOP))
    errs.push({ codigo: "NOM151", mensaje: `SubTotal (${subTotal}) ≠ TotalPercepciones+TotalOtrosPagos (${totalPer + totalOP})` });

  if (!r(total, subTotal - descuento))
    errs.push({ codigo: "CFDI40110", mensaje: `Total (${total}) ≠ SubTotal-Descuento (${subTotal - descuento})` });

  if (!r(descuento, totalDed))
    errs.push({ codigo: "NOM", mensaje: `Descuento (${descuento}) ≠ TotalDeducciones (${totalDed})` });

  if (!r(totalPer, totalSueldos + totalSeparacionIndemnizacion + totalJubilacionPensionRetiro))
    errs.push({ codigo: 'NOM', mensaje: 'TotalPercepciones debe ser igual a TotalSueldos + TotalSeparacionIndemnizacion + TotalJubilacionPensionRetiro.' });
  if (!r(totalPer, totalGravado + totalExento))
    errs.push({ codigo: 'NOM', mensaje: 'TotalPercepciones debe ser igual a TotalGravado + TotalExento.' });
  if (!r(totalDed, totalOtrasDeducciones + totalImpuestosRetenidos))
    errs.push({ codigo: 'NOM', mensaje: 'TotalDeducciones debe ser igual a TotalOtrasDeducciones + TotalImpuestosRetenidos.' });
  if (totalDed > 0 && !hasNode('nomina12:Deducciones'))
    errs.push({ codigo: 'NOM', mensaje: 'Debe existir el nodo Deducciones cuando TotalDeducciones es mayor a cero.' });
  if (totalDed === 0 && hasNode('nomina12:Deducciones'))
    errs.push({ codigo: 'NOM', mensaje: 'El nodo Deducciones no debe existir si no hay deducciones.' });

  const sumaPercepciones = percepciones.reduce((sum, node) => sum + money(attrIn(node, 'ImporteGravado')) + money(attrIn(node, 'ImporteExento')), 0);
  const sumaPercepcionesSueldos = percepciones
    .filter((node) => {
      const tipo = attrIn(node, 'TipoPercepcion') || '';
      return !PERCEPCIONES_SEPARACION_INDEMNIZACION.has(tipo) && !PERCEPCIONES_JUBILACION_RETIRO.has(tipo);
    })
    .reduce((sum, node) => sum + money(attrIn(node, 'ImporteGravado')) + money(attrIn(node, 'ImporteExento')), 0);
  const sumaSeparacion = percepciones
    .filter((node) => PERCEPCIONES_SEPARACION_INDEMNIZACION.has(attrIn(node, 'TipoPercepcion') || ''))
    .reduce((sum, node) => sum + money(attrIn(node, 'ImporteGravado')) + money(attrIn(node, 'ImporteExento')), 0);
  const sumaJubilacion = percepciones
    .filter((node) => PERCEPCIONES_JUBILACION_RETIRO.has(attrIn(node, 'TipoPercepcion') || ''))
    .reduce((sum, node) => sum + money(attrIn(node, 'ImporteGravado')) + money(attrIn(node, 'ImporteExento')), 0);
  const sumaGravado = percepciones.reduce((sum, node) => sum + money(attrIn(node, 'ImporteGravado')), 0);
  const sumaExento = percepciones.reduce((sum, node) => sum + money(attrIn(node, 'ImporteExento')), 0);
  const sumaDeducciones = deducciones.reduce((sum, node) => sum + money(attrIn(node, 'Importe')), 0);
  const sumaISR = deducciones
    .filter((node) => attrIn(node, 'TipoDeduccion') === '002')
    .reduce((sum, node) => sum + money(attrIn(node, 'Importe')), 0);
  const sumaOtrasDeducciones = deducciones
    .filter((node) => attrIn(node, 'TipoDeduccion') !== '002')
    .reduce((sum, node) => sum + money(attrIn(node, 'Importe')), 0);
  const sumaOtrosPagos = otrosPagos.reduce((sum, node) => sum + money(attrIn(node, 'Importe')), 0);

  if (percepciones.length && !r(sumaPercepciones, totalPer))
    errs.push({ codigo: 'NOM', mensaje: 'La suma de percepciones no coincide con TotalPercepciones.' });
  if (!r(sumaPercepcionesSueldos, totalSueldos))
    errs.push({ codigo: 'NOM', mensaje: 'TotalSueldos debe coincidir con las percepciones distintas de separación, indemnización y jubilación.' });
  if (!r(sumaSeparacion, totalSeparacionIndemnizacion))
    errs.push({ codigo: 'NOM', mensaje: 'TotalSeparacionIndemnizacion debe coincidir con percepciones 022, 023 y 025.' });
  if (!r(sumaJubilacion, totalJubilacionPensionRetiro))
    errs.push({ codigo: 'NOM', mensaje: 'TotalJubilacionPensionRetiro debe coincidir con percepciones 039 y 044.' });
  if (!r(sumaGravado, totalGravado)) errs.push({ codigo: 'NOM', mensaje: 'TotalGravado debe coincidir con la suma de ImporteGravado.' });
  if (!r(sumaExento, totalExento)) errs.push({ codigo: 'NOM', mensaje: 'TotalExento debe coincidir con la suma de ImporteExento.' });
  if (!r(sumaDeducciones, totalDed)) errs.push({ codigo: 'NOM', mensaje: 'La suma de deducciones no coincide con TotalDeducciones.' });
  if (!r(sumaISR, totalImpuestosRetenidos)) errs.push({ codigo: 'NOM', mensaje: 'TotalImpuestosRetenidos debe coincidir con deducciones tipo 002.' });
  if (!r(sumaOtrasDeducciones, totalOtrasDeducciones)) errs.push({ codigo: 'NOM', mensaje: 'TotalOtrasDeducciones debe coincidir con deducciones distintas de 002.' });
  if (!r(sumaOtrosPagos, totalOP)) errs.push({ codigo: 'NOM', mensaje: 'La suma de OtrosPagos no coincide con TotalOtrosPagos.' });

  for (const percepcion of percepciones) {
    const tipo = attrIn(percepcion, 'TipoPercepcion') || '';
    const clave = attrIn(percepcion, 'Clave') || '';
    const gravado = money(attrIn(percepcion, 'ImporteGravado'));
    const exento = money(attrIn(percepcion, 'ImporteExento'));
    if (clave.length < 3 || clave.length > 15) errs.push({ codigo: 'NOM', mensaje: `Clave de percepción ${clave || '(vacía)'} debe tener de 3 a 15 caracteres.` });
    if (gravado < 0 || exento < 0) errs.push({ codigo: 'NOM', mensaje: `La percepción ${tipo} no puede tener importes negativos.` });
    if (gravado + exento <= 0) errs.push({ codigo: 'NOM', mensaje: `La percepción ${tipo} debe tener importe mayor a cero.` });
    if (tipo === '038' && exento !== 0) errs.push({ codigo: 'NOM', mensaje: 'La percepción 038 Otros ingresos por salarios debe registrar ImporteExento 0.00.' });
    if (PERCEPCIONES_SEPARACION_INDEMNIZACION.has(tipo) && !hasNode('nomina12:SeparacionIndemnizacion'))
      errs.push({ codigo: 'NOM', mensaje: `La percepción ${tipo} requiere el nodo SeparacionIndemnizacion.` });
    if (PERCEPCIONES_JUBILACION_RETIRO.has(tipo) && !hasNode('nomina12:JubilacionPensionRetiro'))
      errs.push({ codigo: 'NOM', mensaje: `La percepción ${tipo} requiere el nodo JubilacionPensionRetiro.` });
    if (tipo === '039' && !hasAttr('TotalUnaExhibicion'))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 039 requiere TotalUnaExhibicion.' });
    if (tipo === '039' && (hasAttr('TotalParcialidad') || hasAttr('MontoDiario')))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 039 no debe combinarse con TotalParcialidad ni MontoDiario.' });
    if (tipo === '044' && (!hasAttr('TotalParcialidad') || !hasAttr('MontoDiario')))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 044 requiere TotalParcialidad y MontoDiario.' });
    if (tipo === '044' && hasAttr('TotalUnaExhibicion'))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 044 no debe incluir TotalUnaExhibicion.' });
    if (tipo === '045' && !hasNode('nomina12:AccionesOTitulos'))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 045 requiere el nodo AccionesOTitulos.' });
    if (PERCEPCIONES_REQUIEREN_HORAS_EXTRA.has(tipo) && !hasNode('nomina12:HorasExtra'))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 019 requiere el nodo HorasExtra.' });
    if (PERCEPCIONES_REQUIEREN_INCAPACIDAD.has(tipo) && !hasNode('nomina12:Incapacidades'))
      errs.push({ codigo: 'NOM', mensaje: 'La percepción 014 requiere el nodo Incapacidades.' });
  }

  for (const deduccion of deducciones) {
    const tipo = attrIn(deduccion, 'TipoDeduccion') || '';
    const clave = attrIn(deduccion, 'Clave') || '';
    const importe = money(attrIn(deduccion, 'Importe'));
    if (clave.length < 3 || clave.length > 15) errs.push({ codigo: 'NOM', mensaje: `Clave de deducción ${clave || '(vacía)'} debe tener de 3 a 15 caracteres.` });
    if (importe <= 0) errs.push({ codigo: 'NOM', mensaje: `La deducción ${tipo} debe tener importe mayor a cero.` });
    if (DEDUCCIONES_REQUIEREN_INCAPACIDAD.has(tipo) && !hasNode('nomina12:Incapacidades'))
      errs.push({ codigo: 'NOM', mensaje: 'La deducción 006 requiere el nodo Incapacidades.' });
  }

  for (const otroPago of otrosPagos) {
    const tipo = attrIn(otroPago, 'TipoOtroPago') || '';
    const clave = attrIn(otroPago, 'Clave') || '';
    const importe = money(attrIn(otroPago, 'Importe'));
    if (clave.length < 3 || clave.length > 15) errs.push({ codigo: 'NOM', mensaje: `Clave de otro pago ${clave || '(vacía)'} debe tener de 3 a 15 caracteres.` });
    if (importe <= 0) errs.push({ codigo: 'NOM', mensaje: `El otro pago ${tipo} debe tener importe mayor a cero.` });
    if (OTROS_PAGOS_REQUIEREN_SUBSIDIO.has(tipo)) {
      const subsidioNode = otroPago.match(/<nomina12:SubsidioAlEmpleo\b[^>]*\/>/)?.[0] || '';
      const subsidioCausado = money(attrIn(subsidioNode, 'SubsidioCausado'));
      if (!subsidioNode) errs.push({ codigo: 'NOM', mensaje: 'OtroPago 002 requiere el nodo SubsidioAlEmpleo.' });
      if (subsidioNode && subsidioCausado < importe) errs.push({ codigo: 'NOM', mensaje: 'SubsidioCausado debe ser mayor o igual que el importe del OtroPago 002.' });
    }
    if (OTROS_PAGOS_REQUIEREN_COMPENSACION.has(tipo) && !/<nomina12:CompensacionSaldosAFavor\b/.test(otroPago))
      errs.push({ codigo: 'NOM', mensaje: 'OtroPago 004 requiere el nodo CompensacionSaldosAFavor.' });
  }

  for (const incapacidad of incapacidades) {
    const dias = Number(attrIn(incapacidad, 'DiasIncapacidad') || 0);
    if (!Number.isInteger(dias) || dias <= 0) errs.push({ codigo: 'NOM', mensaje: 'DiasIncapacidad debe ser un entero mayor a cero.' });
    if (!attrIn(incapacidad, 'TipoIncapacidad')) errs.push({ codigo: 'NOM', mensaje: 'TipoIncapacidad es obligatorio en cada Incapacidad.' });
    if (attrIn(incapacidad, 'ImporteMonetario') && money(attrIn(incapacidad, 'ImporteMonetario')) < 0)
      errs.push({ codigo: 'NOM', mensaje: 'ImporteMonetario de incapacidad no puede ser negativo.' });
  }

  if (fechaIniRel && fechaPago && fechaIniRel > fechaPago)
    errs.push({ codigo: "NOM36", mensaje: "FechaInicioRelLaboral es posterior a FechaPago" });

  if (/<nomina12:Emisor\s*\/>/.test(xml))
    errs.push({ codigo: "NOM69", mensaje: "Nodo nomina12:Emisor vacío; debe llevar RegistroPatronal o eliminarse" });

  if (/Folio="[^"]*-[^"]*"/.test(xml))
    errs.push({ codigo: "FOLIO", mensaje: "Folio contiene guiones; usar solo alfanumérico" });

  return errs;
}
