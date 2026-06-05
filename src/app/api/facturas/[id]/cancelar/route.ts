import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as soap from 'soap';
// Reutilizamos tu función de firmar para desencriptar el .key del SAT y pasarlo a PEM
import { keyToPem } from '@/lib/sat/firmar';
import { getActiveConfig, getCsdCredentials } from '@/lib/configuracion';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/cancel.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/cancel.wsdl';

// Helper para extraer atributos del XML original
const extractXmlAttribute = (xml: string, tag: string, attr: string) => {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : null;
};

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar factura
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    if (factura.estado === 'CANCELADO') return NextResponse.json({ error: 'La factura ya está cancelada' }, { status: 409 });
    if (factura.estado === 'BORRADOR') {
      const cancelada = await prisma.factura.update({ where: { id }, data: { estado: 'CANCELADO' } });
      return NextResponse.json({ ok: true, factura: cancelada, mensaje: 'Borrador cancelado localmente' });
    }
    if (!factura.xmlTimbrado) return NextResponse.json({ error: 'La factura no tiene XML timbrado.' }, { status: 400 });

    const uuid = extractXmlAttribute(factura.xmlTimbrado, 'TimbreFiscalDigital', 'UUID');
    if (!uuid) return NextResponse.json({ error: 'No se pudo extraer el UUID del XML.' }, { status: 400 });

    // 2. Leer configuraciones guardadas en el sistema
    const [config, csd] = await Promise.all([getActiveConfig(), getCsdCredentials()]);

    if (!config?.rfc) {
      return NextResponse.json({ error: 'Guarda primero el perfil fiscal del emisor.' }, { status: 400 });
    }
    if (!csd?.certificadoBase64 || !csd.llaveBase64 || !csd.password) {
      return NextResponse.json({ error: 'Configura y activa los sellos digitales CSD antes de cancelar.' }, { status: 400 });
    }
    if (!csd.pacUsuario || !csd.pacPassword) {
      return NextResponse.json({ error: 'Configura usuario y contraseña del PAC Finkok antes de cancelar.' }, { status: 400 });
    }

    const rfcEmisor = config.rfc;
    const finkokUser = csd.pacUsuario;
    const finkokPass = csd.pacPassword;
    const ambiente = csd.pacAmbiente || 'prod';

    const cerB64 = csd.certificadoBase64;
    const keyB64 = csd.llaveBase64;
    const csdPassword = csd.password;

    // 3. 🚨 SOLUCIÓN AL ERROR "padding check failed" 🚨
    // Finkok requiere el Certificado y la Llave en formato PEM y codificados en Base64

    // A. Convertir el Certificado DER a PEM
    const cerLines = cerB64.match(/.{1,64}/g)?.join('\n') || cerB64;
    const cerPem = `-----BEGIN CERTIFICATE-----\n${cerLines}\n-----END CERTIFICATE-----\n`;
    const cerFinkok = Buffer.from(cerPem).toString('base64');

    // B. Desencriptar la Llave Privada DER usando la contraseña CSD guardada y convertirla a PEM
    const keyPem = keyToPem(keyB64, csdPassword);
    const keyFinkok = Buffer.from(keyPem).toString('base64');

    // 4. Crear cliente SOAP
    const wsdl = ambiente === 'demo' ? WSDL_DEMO : WSDL_PROD;
    const client = await soap.createClientAsync(wsdl);

    // 5. Configurar los parámetros exactos para Finkok usando el truco $xml para el array de UUIDS
    const args = {
      UUIDS: {
        $xml: `<apps:UUID UUID="${uuid}" FolioSustitucion="" Motivo="02" xmlns:apps="apps.services.soap.core.views"/>`
      },
      username: finkokUser,
      password: finkokPass,
      taxpayer_id: rfcEmisor,
      cer: cerFinkok,
      key: keyFinkok,
      store_pending: false
    };

    // 6. Ejecutar la cancelación
    const [result] = await client.cancelAsync(args);
    const cancelResult = result?.cancelResult;

    if (!cancelResult) throw new Error('FINKOK no devolvió respuesta');

    // 7. Evaluar la respuesta
    const folios = cancelResult.Folios?.Folio;
    const folioData = Array.isArray(folios) ? folios[0] : folios;
    const estatusUUID = folioData?.EstatusUUID;

    // "201": Petición de cancelación realizada exitosamente
    // "202": Previamente cancelado
    if (estatusUUID === '201' || estatusUUID === '202') {
      const cancelada = await prisma.factura.update({
        where: { id },
        data: { estado: 'CANCELADO' },
      });
      return NextResponse.json({ ok: true, factura: cancelada, mensaje: `Cancelada en el SAT (Cod: ${estatusUUID})` });
    } else {
      const errorMsg = cancelResult.CodEstatus || folioData?.EstatusCancelacion || 'Error desconocido';
      throw new Error(`Finkok rechazó la cancelación. Mensaje: ${errorMsg}`);
    }

  } catch (err: any) {
    console.error('❌ Error en cancelación:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
