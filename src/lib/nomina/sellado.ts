import { createSign } from "crypto";
import { XMLParser } from "fast-xml-parser";

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    parseAttributeValue: false,
    trimValues: false,
});

const asNode = (value: unknown): XmlNode => (value && typeof value === "object" ? value as XmlNode : {});
const asArray = (value: unknown): XmlNode[] => {
    if (!value) return [];
    return Array.isArray(value) ? value.map(asNode) : [asNode(value)];
};

const pushAttrs = (parts: string[], node: XmlNode, attrs: string[]) => {
    for (const attr of attrs) {
        const value = node[attr];
        if (value === undefined || value === null) continue;
        const text = String(value).trim().replace(/\s+/g, " ");
        if (text !== "") parts.push(text);
    }
};

const pushImpuestosCfdi = (parts: string[], impuestos: XmlNode) => {
    for (const retencion of asArray(asNode(impuestos.Retenciones).Retencion)) {
        pushAttrs(parts, retencion, ["Base", "Impuesto", "TipoFactor", "TasaOCuota", "Importe"]);
    }
    pushAttrs(parts, impuestos, ["TotalImpuestosRetenidos"]);
    for (const traslado of asArray(asNode(impuestos.Traslados).Traslado)) {
        pushAttrs(parts, traslado, ["Base", "Impuesto", "TipoFactor", "TasaOCuota", "Importe"]);
    }
    pushAttrs(parts, impuestos, ["TotalImpuestosTrasladados"]);
};

const pushNomina = (parts: string[], nomina: XmlNode) => {
    pushAttrs(parts, nomina, [
        "Version", "TipoNomina", "FechaPago", "FechaInicialPago", "FechaFinalPago", "NumDiasPagados",
        "TotalPercepciones", "TotalDeducciones", "TotalOtrosPagos",
    ]);

    for (const emisor of asArray(nomina.Emisor)) {
        pushAttrs(parts, emisor, ["Curp", "RegistroPatronal", "RfcPatronOrigen"]);
        for (const entidad of asArray(emisor.EntidadSNCF)) pushAttrs(parts, entidad, ["OrigenRecurso", "MontoRecursoPropio"]);
    }

    for (const receptor of asArray(nomina.Receptor)) {
        pushAttrs(parts, receptor, [
            "Curp", "NumSeguridadSocial", "FechaInicioRelLaboral", "Antigüedad", "TipoContrato",
            "Sindicalizado", "TipoJornada", "TipoRegimen", "NumEmpleado", "Departamento", "Puesto",
            "RiesgoPuesto", "PeriodicidadPago", "Banco", "CuentaBancaria", "SalarioBaseCotApor",
            "SalarioDiarioIntegrado", "ClaveEntFed",
        ]);
        for (const sub of asArray(receptor.SubContratacion)) pushAttrs(parts, sub, ["RfcLabora", "PorcentajeTiempo"]);
    }

    for (const percepciones of asArray(nomina.Percepciones)) {
        pushAttrs(parts, percepciones, [
            "TotalSueldos", "TotalSeparacionIndemnizacion", "TotalJubilacionPensionRetiro", "TotalGravado", "TotalExento",
        ]);
        for (const percepcion of asArray(percepciones.Percepcion)) {
            pushAttrs(parts, percepcion, ["TipoPercepcion", "Clave", "Concepto", "ImporteGravado", "ImporteExento"]);
            for (const acciones of asArray(percepcion.AccionesOTitulos)) pushAttrs(parts, acciones, ["ValorMercado", "PrecioAlOtorgarse"]);
            for (const horas of asArray(percepcion.HorasExtra)) pushAttrs(parts, horas, ["Dias", "TipoHoras", "HorasExtra", "ImportePagado"]);
        }
        for (const jubilacion of asArray(percepciones.JubilacionPensionRetiro)) {
            pushAttrs(parts, jubilacion, ["TotalUnaExhibicion", "TotalParcialidad", "MontoDiario", "IngresoAcumulable", "IngresoNoAcumulable"]);
        }
        for (const separacion of asArray(percepciones.SeparacionIndemnizacion)) {
            pushAttrs(parts, separacion, ["TotalPagado", "NumAñosServicio", "UltimoSueldoMensOrd", "IngresoAcumulable", "IngresoNoAcumulable"]);
        }
    }

    for (const deducciones of asArray(nomina.Deducciones)) {
        pushAttrs(parts, deducciones, ["TotalOtrasDeducciones", "TotalImpuestosRetenidos"]);
        for (const deduccion of asArray(deducciones.Deduccion)) {
            pushAttrs(parts, deduccion, ["TipoDeduccion", "Clave", "Concepto", "Importe"]);
        }
    }

    for (const otrosPagos of asArray(nomina.OtrosPagos)) {
        for (const otroPago of asArray(otrosPagos.OtroPago)) {
            pushAttrs(parts, otroPago, ["TipoOtroPago", "Clave", "Concepto", "Importe"]);
            for (const subsidio of asArray(otroPago.SubsidioAlEmpleo)) pushAttrs(parts, subsidio, ["SubsidioCausado"]);
            for (const compensacion of asArray(otroPago.CompensacionSaldosAFavor)) {
                pushAttrs(parts, compensacion, ["SaldoAFavor", "Año", "RemanenteSalFav"]);
            }
        }
    }

    for (const incapacidades of asArray(nomina.Incapacidades)) {
        for (const incapacidad of asArray(incapacidades.Incapacidad)) {
            pushAttrs(parts, incapacidad, ["DiasIncapacidad", "TipoIncapacidad", "ImporteMonetario"]);
        }
    }
};

export async function generarCadenaOriginal(xml: string): Promise<string> {
    const doc = parser.parse(xml);
    const comprobante = asNode(doc.Comprobante);
    if (!Object.keys(comprobante).length) throw new Error("No se encontró el nodo cfdi:Comprobante para la cadena original.");

    const parts: string[] = [];
    pushAttrs(parts, comprobante, [
        "Version", "Serie", "Folio", "Fecha", "FormaPago", "NoCertificado", "CondicionesDePago",
        "SubTotal", "Descuento", "Moneda", "TipoCambio", "Total", "TipoDeComprobante", "Exportacion",
        "MetodoPago", "LugarExpedicion", "Confirmacion",
    ]);

    pushAttrs(parts, asNode(comprobante.Emisor), ["Rfc", "Nombre", "RegimenFiscal", "FacAtrAdquirente"]);
    pushAttrs(parts, asNode(comprobante.Receptor), [
        "Rfc", "Nombre", "DomicilioFiscalReceptor", "ResidenciaFiscal", "NumRegIdTrib", "RegimenFiscalReceptor", "UsoCFDI",
    ]);

    for (const concepto of asArray(asNode(comprobante.Conceptos).Concepto)) {
        pushAttrs(parts, concepto, [
            "ClaveProdServ", "NoIdentificacion", "Cantidad", "ClaveUnidad", "Unidad", "Descripcion",
            "ValorUnitario", "Importe", "Descuento", "ObjetoImp",
        ]);
        const impuestos = asNode(concepto.Impuestos);
        if (Object.keys(impuestos).length) pushImpuestosCfdi(parts, impuestos);
    }

    const impuestos = asNode(comprobante.Impuestos);
    if (Object.keys(impuestos).length) pushImpuestosCfdi(parts, impuestos);

    const complemento = asNode(comprobante.Complemento);
    for (const nomina of asArray(complemento.Nomina)) pushNomina(parts, nomina);

    return `||${parts.join("|")}||`;
}

export function sellarCadena(cadena: string, keyPem: string): string {
    return createSign("RSA-SHA256").update(cadena, "utf8").sign(keyPem, "base64");
}

export function inyectarCertificado(
    xml: string,
    { certificado, noCertificado }: { certificado: string; noCertificado: string }
): string {
    const withoutCert = xml
        .replace(/\sNoCertificado="[^"]*"/, "")
        .replace(/\sCertificado="[^"]*"/, "");

    return withoutCert.replace(
        /<cfdi:Comprobante\s/,
        `<cfdi:Comprobante NoCertificado="${noCertificado}" Certificado="${certificado}" `
    );
}

export function inyectarSello(
    xml: string,
    { sello, certificado, noCertificado }: { sello: string; certificado?: string; noCertificado?: string }
): string {
    const xmlConCertificado = certificado && noCertificado
        ? inyectarCertificado(xml, { certificado, noCertificado })
        : xml;

    if (/\sSello="[^"]*"/.test(xmlConCertificado)) {
        return xmlConCertificado.replace(/\sSello="[^"]*"/, ` Sello="${sello}"`);
    }

    return xmlConCertificado.replace(/<cfdi:Comprobante\s/, `<cfdi:Comprobante Sello="${sello}" `);
}
