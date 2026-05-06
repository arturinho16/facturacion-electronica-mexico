import * as soap from 'soap';
import { getCsdCredentials } from '@/lib/configuracion';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

export async function timbrarNominaFinkok(xmlFirmado: string) {
    const credentials = await getCsdCredentials();
    const usuario = credentials?.pacUsuario;
    const password = credentials?.pacPassword;
    const ambiente = credentials?.pacAmbiente || 'demo';
    const wsdl = credentials?.pacStampUrl || (ambiente === 'prod' ? WSDL_PROD : WSDL_DEMO);

    if (!usuario || !password) {
        throw new Error('Configura usuario y contraseña del PAC Finkok antes de timbrar.');
    }

    const client = await soap.createClientAsync(wsdl);
    const xmlBase64 = Buffer.from(xmlFirmado, 'utf8').toString('base64');
    const [result] = await client.stampAsync({ xml: xmlBase64, username: usuario, password });
    const stampResult = result?.stampResult;

    if (!stampResult?.UUID) {
        const incidencias = stampResult?.Incidencias?.Incidencia;
        const incidencia = Array.isArray(incidencias) ? incidencias[0] : incidencias;
        throw new Error(incidencia?.MensajeIncidencia || stampResult?.CodEstatus || 'Error de timbrado con Finkok');
    }

    let xmlTimbrado = stampResult.xml;
    if (Buffer.isBuffer(xmlTimbrado)) xmlTimbrado = xmlTimbrado.toString('utf8');
    if (typeof xmlTimbrado !== 'string') xmlTimbrado = String(xmlTimbrado);
    if (!xmlTimbrado.includes('cfdi:Comprobante')) {
        const decoded = Buffer.from(xmlTimbrado, 'base64').toString('utf8');
        if (decoded.includes('cfdi:Comprobante')) xmlTimbrado = decoded;
    }

    return {
        uuid: stampResult.UUID as string,
        xmlTimbrado: xmlTimbrado.replace(/^\uFEFF/, '').trim(),
        noCertificadoSAT: stampResult.NoCertificadoSAT as string,
        codEstatus: stampResult.CodEstatus as string,
        raw: stampResult,
    };
}
