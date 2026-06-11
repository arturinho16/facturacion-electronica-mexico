import type { EmpleadoNomina, DatosEmisor, PeriodoNomina } from "@/lib/nomina/types";

/* ========= Helpers ========= */
const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const f2 = (n: number) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
const f3 = (n: number) => (Math.round((n + Number.EPSILON) * 1000) / 1000).toFixed(3);
const nombreFiscal = (v: unknown): string => String(v ?? "").trim().replace(/\s+/g, " ").toUpperCase();

/** Fecha ISO sin zona (formato SAT: yyyy-MM-ddTHH:mm:ss) con hora real, -1 min por seguridad */
const fechaEmisionSAT = (d = new Date()): string => {
  const pad = (x: number) => String(x).padStart(2, "0");
  const dt = new Date(d.getTime() - 60_000);
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
    `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
  );
};

/** Folio SAT: alfanumérico 1-40 sin guiones */
const sanitizeFolio = (folio: string | number): string =>
  String(folio).replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "1";

const buildEntidadSncf = (emisor: DatosEmisor): string => {
  if (!emisor.entidadSncf) return "";

  const { origenRecurso, montoRecursoPropio } = emisor.entidadSncf;
  const monto = montoRecursoPropio !== undefined ? ` MontoRecursoPropio="${f2(montoRecursoPropio)}"` : "";
  return `        <nomina12:EntidadSNCF OrigenRecurso="${esc(origenRecurso)}"${monto}/>`;
};

const buildNominaEmisor = (emisor: DatosEmisor): string => {
  const attrs = [
    emisor.registroPatronal ? `RegistroPatronal="${esc(emisor.registroPatronal)}"` : "",
    emisor.rfcPatronOrigen ? `RfcPatronOrigen="${esc(emisor.rfcPatronOrigen)}"` : "",
  ].filter(Boolean).join(" ");
  const entidadSncf = buildEntidadSncf(emisor);

  if (!attrs && !entidadSncf) return "";
  if (!entidadSncf) return `      <nomina12:Emisor ${attrs}/>`;

  return `      <nomina12:Emisor${attrs ? ` ${attrs}` : ""}>
${entidadSncf}
      </nomina12:Emisor>`;
};

/* ========= Tipos de entrada ========= */
export interface GenerarXMLParams {
  emisor: DatosEmisor;           // { rfc, nombre, regimenFiscal, lugarExpedicion, registroPatronal? }
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscal: string;     // CP
    regimenFiscalReceptor: string; // 605 persona física
    usoCFDI: string;             // CN01 para nómina
  };
  empleado: EmpleadoNomina;
  periodo: PeriodoNomina;
  percepciones: Array<{ tipo: string; clave: string; concepto: string; gravado: number; exento: number }>;
  deducciones: Array<{ tipo: string; clave: string; concepto: string; importe: number }>;
  otrosPagos?: Array<{
    tipo: string; clave: string; concepto: string; importe: number;
    subsidioCausado?: number;
  }>;
  serie?: string;
  folio: string | number;
}

/* ========= Generador ========= */
export function generarXMLNomina(p: GenerarXMLParams): string {
  /* --- Guardas defensivas --- */
  if (!p || typeof p !== "object") {
    throw new Error("generarXMLNomina: parámetros vacíos");
  }
  if (!p.emisor) throw new Error("generarXMLNomina: falta 'emisor'");
  if (!p.receptor) throw new Error("generarXMLNomina: falta 'receptor'");
  if (!p.empleado) throw new Error("generarXMLNomina: falta 'empleado'");
  if (!p.periodo) throw new Error("generarXMLNomina: falta 'periodo'");

  // Arreglos opcionales con fallback
  const percepciones = p.percepciones ?? [];
  const deducciones = p.deducciones ?? [];
  const otrosPagos = p.otrosPagos ?? [];

  if (percepciones.length === 0) {
    throw new Error("generarXMLNomina: se requiere al menos una percepción");
  }

  /* --- Totales calculados --- */
  const totalGravado = percepciones.reduce((s, x) => s + (+x.gravado || 0), 0);
  const totalExento = percepciones.reduce((s, x) => s + (+x.exento || 0), 0);
  const totalPercep = totalGravado + totalExento;
  const tiposSeparacion = new Set(["022", "023", "025"]);
  const tiposJubilacion = new Set(["039", "044"]);
  const totalSueldos = percepciones
    .filter(x => !tiposSeparacion.has(x.tipo) && !tiposJubilacion.has(x.tipo))
    .reduce((s, x) => s + (+x.gravado || 0) + (+x.exento || 0), 0);
  const totalSeparacionIndemnizacion = percepciones
    .filter(x => tiposSeparacion.has(x.tipo))
    .reduce((s, x) => s + (+x.gravado || 0) + (+x.exento || 0), 0);
  const totalJubilacionPensionRetiro = percepciones
    .filter(x => tiposJubilacion.has(x.tipo))
    .reduce((s, x) => s + (+x.gravado || 0) + (+x.exento || 0), 0);

  const totalImpRet = deducciones.filter(x => x.tipo === "002").reduce((s, x) => s + (+x.importe || 0), 0);
  const totalOtrasDed = deducciones.filter(x => x.tipo !== "002").reduce((s, x) => s + (+x.importe || 0), 0);
  const totalDed = totalImpRet + totalOtrasDed;

  const totalOtrosPagos = otrosPagos.reduce((s, x) => s + (+x.importe || 0), 0);

  const subTotal = totalPercep + totalOtrosPagos;
  const descuento = totalDed;
  const total = subTotal - descuento;

  /* --- Atributos Comprobante --- */
  const fecha = fechaEmisionSAT();
  const folio = sanitizeFolio(p.folio ?? Date.now());

  /* --- Construcción XML --- */
  const hasEmisorNomina = !!p.emisor.registroPatronal;
  const hasOtrosPagos = (p.otrosPagos?.length ?? 0) > 0;
  const hasDeducciones = deducciones.length > 0;
  const includeDatosLaboralesIMSS = hasEmisorNomina;
  const emisorNombre = nombreFiscal(p.emisor.nombre);
  const receptorNombre = nombreFiscal(p.receptor.nombre);
  const nominaEmisor = buildNominaEmisor(p.emisor);

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:nomina12="http://www.sat.gob.mx/nomina12" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd" Version="4.0"${p.serie ? ` Serie="${esc(p.serie)}"` : ""} Folio="${esc(folio)}" Fecha="${fecha}" SubTotal="${f2(subTotal)}"${descuento > 0 ? ` Descuento="${f2(descuento)}"` : ""} Moneda="MXN" Total="${f2(total)}" TipoDeComprobante="N" Exportacion="01" MetodoPago="PUE" LugarExpedicion="${esc(p.emisor.lugarExpedicion)}">
  <cfdi:Emisor Rfc="${esc(p.emisor.rfc)}" Nombre="${esc(emisorNombre)}" RegimenFiscal="${esc(p.emisor.regimenFiscal)}"/>
  <cfdi:Receptor Rfc="${esc(p.receptor.rfc)}" Nombre="${esc(receptorNombre)}" DomicilioFiscalReceptor="${esc(p.receptor.domicilioFiscal)}" RegimenFiscalReceptor="${esc(p.receptor.regimenFiscalReceptor)}" UsoCFDI="${esc(p.receptor.usoCFDI)}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111505" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago de nómina" ValorUnitario="${f2(subTotal)}" Importe="${f2(subTotal)}"${descuento > 0 ? ` Descuento="${f2(descuento)}"` : ""} ObjetoImp="01"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="${esc(p.periodo.tipoNomina)}" FechaPago="${esc(p.periodo.fechaPago)}" FechaInicialPago="${esc(p.periodo.fechaInicial)}" FechaFinalPago="${esc(p.periodo.fechaFinal)}" NumDiasPagados="${f3(p.periodo.numDiasPagados)}" TotalPercepciones="${f2(totalPercep)}"${hasDeducciones ? ` TotalDeducciones="${f2(totalDed)}"` : ""}${hasOtrosPagos ? ` TotalOtrosPagos="${f2(totalOtrosPagos)}"` : ""}>
${nominaEmisor}
      <nomina12:Receptor Curp="${esc(p.empleado.curp)}"${includeDatosLaboralesIMSS && p.empleado.nss ? ` NumSeguridadSocial="${esc(p.empleado.nss)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.fechaInicioRelLaboral ? ` FechaInicioRelLaboral="${esc(p.empleado.fechaInicioRelLaboral)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.antiguedad ? ` Antigüedad="${esc(p.empleado.antiguedad)}"` : ""} TipoContrato="${esc(p.empleado.tipoContrato)}"${p.empleado.sindicalizado ? ` Sindicalizado="${esc(p.empleado.sindicalizado)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.tipoJornada ? ` TipoJornada="${esc(p.empleado.tipoJornada)}"` : ""} TipoRegimen="${esc(p.empleado.tipoRegimen)}" NumEmpleado="${esc(p.empleado.numEmpleado)}"${p.empleado.departamento ? ` Departamento="${esc(p.empleado.departamento)}"` : ""}${p.empleado.puesto ? ` Puesto="${esc(p.empleado.puesto)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.riesgoPuesto ? ` RiesgoPuesto="${esc(p.empleado.riesgoPuesto)}"` : ""} PeriodicidadPago="${esc(p.empleado.periodicidadPago)}"${p.empleado.banco ? ` Banco="${esc(p.empleado.banco)}"` : ""}${p.empleado.cuentaBancaria ? ` CuentaBancaria="${esc(p.empleado.cuentaBancaria)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.salarioBaseCotApor ? ` SalarioBaseCotApor="${f2(p.empleado.salarioBaseCotApor)}"` : ""}${includeDatosLaboralesIMSS && p.empleado.salarioDiarioIntegrado ? ` SalarioDiarioIntegrado="${f2(p.empleado.salarioDiarioIntegrado)}"` : ""} ClaveEntFed="${esc(p.empleado.claveEntFed)}"/>
      <nomina12:Percepciones${totalSueldos > 0 ? ` TotalSueldos="${f2(totalSueldos)}"` : ""}${totalSeparacionIndemnizacion > 0 ? ` TotalSeparacionIndemnizacion="${f2(totalSeparacionIndemnizacion)}"` : ""}${totalJubilacionPensionRetiro > 0 ? ` TotalJubilacionPensionRetiro="${f2(totalJubilacionPensionRetiro)}"` : ""} TotalGravado="${f2(totalGravado)}" TotalExento="${f2(totalExento)}">
${percepciones.map(x =>
      `        <nomina12:Percepcion TipoPercepcion="${esc(x.tipo)}" Clave="${esc(x.clave)}" Concepto="${esc(x.concepto)}" ImporteGravado="${f2(x.gravado)}" ImporteExento="${f2(x.exento)}"/>`
    ).join("\n")}
      </nomina12:Percepciones>
${hasDeducciones ? `      <nomina12:Deducciones${totalOtrasDed > 0 ? ` TotalOtrasDeducciones="${f2(totalOtrasDed)}"` : ""}${totalImpRet > 0 ? ` TotalImpuestosRetenidos="${f2(totalImpRet)}"` : ""}>
${deducciones.map(x =>
      `        <nomina12:Deduccion TipoDeduccion="${esc(x.tipo)}" Clave="${esc(x.clave)}" Concepto="${esc(x.concepto)}" Importe="${f2(x.importe)}"/>`
    ).join("\n")}
      </nomina12:Deducciones>` : ""}
${hasOtrosPagos ? `      <nomina12:OtrosPagos>
${otrosPagos!.map(x =>
      `        <nomina12:OtroPago TipoOtroPago="${esc(x.tipo)}" Clave="${esc(x.clave)}" Concepto="${esc(x.concepto)}" Importe="${f2(x.importe)}">${x.tipo === "002"
        ? `\n          <nomina12:SubsidioAlEmpleo SubsidioCausado="${f2(x.subsidioCausado ?? 0)}"/>\n        `
        : ""
      }</nomina12:OtroPago>`
    ).join("\n")}
      </nomina12:OtrosPagos>` : ""}
    </nomina12:Nomina>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

  // Quitar líneas vacías que deja el template literal
  return xml.replace(/^\s*\n/gm, "").replace(/\n\s*\n/g, "\n");
}
