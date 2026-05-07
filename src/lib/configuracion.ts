import nodemailer from 'nodemailer';
import * as forge from 'node-forge';
import { prisma } from '@/lib/prisma';
import type { ConfiguracionFiscal, Prisma, PrismaClient } from '@prisma/client';


type CertKind = 'CSD' | 'FIEL';
type ConfigInput = Record<string, unknown>;

export type CertificateStatus = 'SIN_CARGAR' | 'ACTIVO' | 'CADUCO' | 'INCOMPLETO' | 'ERROR';

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function asBase64Payload(value: string) {
  return value.includes(',') ? value.split(',').pop() || '' : value;
}

function certSerial(cert: forge.pki.Certificate) {
  const hex = cert.serialNumber || '';
  const pairs = hex.match(/.{1,2}/g) || [];
  return pairs.map((pair) => String.fromCharCode(parseInt(pair, 16))).join('').replace(/\D/g, '') || hex;
}

export function inspectCertificate(cerBase64: string | null | undefined): {
  noCertificado: string | null;
  vigenteDesde: Date | null;
  vigenteHasta: Date | null;
  estatus: CertificateStatus;
  mensaje: string;
} {
  if (!cerBase64) {
    return { noCertificado: null, vigenteDesde: null, vigenteHasta: null, estatus: 'SIN_CARGAR', mensaje: 'No se ha cargado certificado.' };
  }

  try {
    const der = forge.util.decode64(asBase64Payload(cerBase64));
    const asn1 = forge.asn1.fromDer(der);
    const cert = forge.pki.certificateFromAsn1(asn1);
    const now = new Date();
    const vigenteDesde = cert.validity.notBefore;
    const vigenteHasta = cert.validity.notAfter;
    const estatus = now >= vigenteDesde && now <= vigenteHasta ? 'ACTIVO' : 'CADUCO';

    return {
      noCertificado: certSerial(cert),
      vigenteDesde,
      vigenteHasta,
      estatus,
      mensaje: estatus === 'ACTIVO' ? 'Certificado vigente.' : 'Certificado vencido o todavía no vigente.',
    };
  } catch (error: unknown) {
    return {
      noCertificado: null,
      vigenteDesde: null,
      vigenteHasta: null,
      estatus: 'ERROR',
      mensaje: error instanceof Error ? error.message : 'No se pudo leer el certificado.',
    };
  }
}

export async function getActiveConfig() {
  return await prisma.configuracionFiscal.findFirst({
    where: { activo: true },
    orderBy: { updatedAt: 'desc' },
  });
}

type TimbreDb = PrismaClient | Prisma.TransactionClient;

export async function registrarTimbreUsado(db: TimbreDb = prisma) {
  const config = await db.configuracionFiscal.findFirst({
    where: { activo: true },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (!config) return;

  await db.$executeRaw`
    UPDATE "ConfiguracionFiscal"
    SET
      "timbresUsados" = "timbresUsados" + 1,
      "timbresDisponibles" = GREATEST("timbresContratados" - ("timbresUsados" + 1), 0),
      "updatedAt" = NOW()
    WHERE "id" = ${config.id}
  `;
}

export function buildConfigPayload(body: ConfigInput) {
  return {
    rfc: String(body.rfc || '').toUpperCase().trim(),
    razonSocial: String(body.razonSocial || '').trim(),
    nombreComercial: clean(body.nombreComercial),
    regimenFiscal: String(body.regimenFiscal || '').trim(),
    codigoPostal: String(body.codigoPostal || '').trim(),
    pais: 'MEX',
    estado: clean(body.estado),
    municipio: clean(body.municipio),
    colonia: clean(body.colonia),
    calle: clean(body.calle),
    numeroExterior: clean(body.numeroExterior),
    numeroInterior: clean(body.numeroInterior),
    telefono: clean(body.telefono),
    email: clean(body.email)?.toLowerCase() ?? null,
    sitioWeb: clean(body.sitioWeb),
    representanteLegal: clean(body.representanteLegal),
    registroPatronal: clean(body.registroPatronal),
    logoUrl: clean(body.logoUrl),
    logoMimeType: clean(body.logoMimeType),
    aparienciaHeaderColor: clean(body.aparienciaHeaderColor) || '#2563eb',
    pacProveedor: clean(body.pacProveedor) || 'FINKOK',
    pacUsuario: clean(body.pacUsuario),
    pacPasswordEncrypted: clean(body.pacPassword) || clean(body.pacPasswordEncrypted),
    pacAmbiente: clean(body.pacAmbiente) || 'demo',
    pacStampUrl: clean(body.pacStampUrl),
    folioNominaSerie: clean(body.folioNominaSerie) || 'NOM',
    timbresContratados: Math.max(0, Number(body.timbresContratados) || 0),
    timbresUsados: Math.max(0, Number(body.timbresUsados) || 0),
    timbresDisponibles: Math.max(0, (Number(body.timbresContratados) || 0) - (Number(body.timbresUsados) || 0)),
    correoRemitenteNombre: clean(body.correoRemitenteNombre),
    correoRemitenteEmail: clean(body.correoRemitenteEmail)?.toLowerCase() ?? null,
    correoHost: clean(body.correoHost),
    correoPuerto: body.correoPuerto ? Number(body.correoPuerto) : null,
    correoSeguro: Boolean(body.correoSeguro),
    correoUsuario: clean(body.correoUsuario),
    correoPasswordEncrypted: clean(body.correoPassword) || clean(body.correoPasswordEncrypted),
  };
}

export function publicConfig(config: ConfiguracionFiscal | null | undefined) {
  if (!config) return {};

  const csdStatus = inspectCertificate(config.csdCertificadoBase64);
  const fielStatus = inspectCertificate(config.fielCertificadoBase64);
  const hasMail = Boolean(config.correoHost && config.correoPuerto && config.correoUsuario && config.correoPasswordEncrypted);

  const { csdCertificadoBase64, csdLlaveBase64, csdPasswordEncrypted, fielCertificadoBase64, fielLlaveBase64, fielPasswordEncrypted, pacPasswordEncrypted, correoPasswordEncrypted, ...safe } = config;

  return {
    ...safe,
    correoOrigen: hasMail ? 'BD' : undefined,
    csdEstatus: csdStatus.estatus,
    csdNoCertificado: csdStatus.noCertificado ?? config.csdNoCertificado,
    csdVigenteDesde: csdStatus.vigenteDesde ?? config.csdVigenteDesde,
    csdVigenteHasta: csdStatus.vigenteHasta ?? config.csdVigenteHasta,
    csdMensaje: csdStatus.mensaje,
    csdCargado: Boolean(csdCertificadoBase64 && csdLlaveBase64 && csdPasswordEncrypted),
    fielEstatus: fielStatus.estatus,
    fielNoCertificado: fielStatus.noCertificado ?? config.fielNoCertificado,
    fielVigenteDesde: fielStatus.vigenteDesde ?? config.fielVigenteDesde,
    fielVigenteHasta: fielStatus.vigenteHasta ?? config.fielVigenteHasta,
    fielMensaje: fielStatus.mensaje,
    fielCargado: Boolean(fielCertificadoBase64 && fielLlaveBase64 && fielPasswordEncrypted),
    correoEstatus: hasMail ? 'CONFIGURADO' : config.correoEstatus || 'SIN_CONFIGURAR',
    correoPasswordConfigurado: Boolean(correoPasswordEncrypted),
    pacPasswordConfigurado: Boolean(pacPasswordEncrypted),
  };
}

export async function saveCertificate(kind: CertKind, cerBase64: string, keyBase64: string, password: string) {
  const config = await getActiveConfig();
  if (!config) throw new Error('Primero guarda el perfil fiscal.');

  const inspection = inspectCertificate(cerBase64);
  const data =
    kind === 'FIEL'
      ? {
        fielCertificadoBase64: cerBase64,
        fielLlaveBase64: keyBase64,
        fielPasswordEncrypted: password,
        fielNoCertificado: inspection.noCertificado,
        fielVigenteDesde: inspection.vigenteDesde,
        fielVigenteHasta: inspection.vigenteHasta,
        fielEstatus: inspection.estatus,
        fielUltimaValidacion: new Date(),
      }
      : {
        csdCertificadoBase64: cerBase64,
        csdLlaveBase64: keyBase64,
        csdPasswordEncrypted: password,
        csdNoCertificado: inspection.noCertificado,
        csdVigenteDesde: inspection.vigenteDesde,
        csdVigenteHasta: inspection.vigenteHasta,
        csdEstatus: inspection.estatus,
        csdUltimaValidacion: new Date(),
      };

  await prisma.configuracionFiscal.update({ where: { id: config.id }, data });
  return inspection;
}

export async function getCsdCredentials() {
  const config = await getActiveConfig();
  if (!config?.csdCertificadoBase64 || !config?.csdLlaveBase64 || !config?.csdPasswordEncrypted) return null;
  return {
    certificadoBase64: config.csdCertificadoBase64,
    llaveBase64: config.csdLlaveBase64,
    password: config.csdPasswordEncrypted,
    pacUsuario: config.pacUsuario || '',
    pacPassword: config.pacPasswordEncrypted || '',
    pacAmbiente: config.pacAmbiente || 'demo',
    pacStampUrl: config.pacStampUrl || '',
  };
}

export async function getFielCredentialsAsBinary() {
  const config = await getActiveConfig();
  if (!config?.fielCertificadoBase64 || !config?.fielLlaveBase64 || !config?.fielPasswordEncrypted) return null;
  return {
    rfc: config.rfc,
    password: config.fielPasswordEncrypted,
    cerString: Buffer.from(asBase64Payload(config.fielCertificadoBase64), 'base64').toString('binary'),
    keyString: Buffer.from(asBase64Payload(config.fielLlaveBase64), 'base64').toString('binary'),
  };
}



export async function getMailTransport() {
  const config = await getActiveConfig();

  const usuario = config?.correoUsuario;
  const password = config?.correoPasswordEncrypted;
  const host = config?.correoHost;
  const puerto = Number(config?.correoPuerto) || 587;
  const isSecure = typeof config?.correoSeguro === 'boolean' ? config.correoSeguro : puerto === 465;
  const fromEmail = config?.correoRemitenteEmail || usuario;
  const fromName = config?.correoRemitenteNombre || config?.nombreComercial || 'TuFisTi Autofacturador';

  if (!host || !usuario || !password || !fromEmail) {
    throw new Error('Correo saliente no configurado. Configura SMTP antes de enviar notificaciones.');
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port: puerto,
      secure: isSecure,
      auth: {
        user: usuario,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false
      }
    }),
    from: `"${fromName}" <${fromEmail}>`,
  };
}

export function fiscalAddress(config: Pick<ConfiguracionFiscal, 'calle' | 'numeroExterior' | 'numeroInterior' | 'colonia' | 'municipio' | 'estado'>) {
  return [config.calle, config.numeroExterior, config.numeroInterior ? `Int. ${config.numeroInterior}` : null, config.colonia, config.municipio, config.estado]
    .filter(Boolean)
    .join(', ');
}
