'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ArrowLeft,
    Inbox,
    Search,
    Loader2,
    FileCode,
    FileText,
    RefreshCw,
    Archive,
    Clock,
    ShieldCheck,
    LogOut,
    UploadCloud,
    KeyRound,
    Send,
    Calendar,
    CheckSquare,
    Download,
    X,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { FacturaPDF } from '@/lib/pdf/FacturaPDF';

type FacturaRecibida = {
    id: string;
    uuid: string;
    emisorRfc: string;
    emisorNombre: string;
    fechaEmision: string;
    total: number;
    moneda: string;
    estadoSat: string;
    xmlContenido?: string;
};

type SolicitudSAT = {
    id: string;
    requestId: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    mensajeSat?: string | null;
    createdAt: string;
};

type PerfilClave = 'principal' | 'perfil_1' | 'perfil_2' | 'perfil_3';

const PERFILES_DESCARGA: Record<PerfilClave, { titulo: string; etiqueta: string; ruta: string; principal: boolean }> = {
    principal: { titulo: 'Facturas Recibidas', etiqueta: 'RFC principal', ruta: '/facturas-recibidas', principal: true },
    perfil_1: { titulo: 'Facturas Recibidas - RFC-1', etiqueta: 'RFC-1', ruta: '/facturas-recibidas/perfil-1', principal: false },
    perfil_2: { titulo: 'Facturas Recibidas - RFC-2', etiqueta: 'RFC-2', ruta: '/facturas-recibidas/perfil-2', principal: false },
    perfil_3: { titulo: 'Facturas Recibidas - RFC-3', etiqueta: 'RFC-3', ruta: '/facturas-recibidas/perfil-3', principal: false },
};

const perfilFromPath = (pathname: string): PerfilClave => {
    if (pathname.includes('/perfil-1')) return 'perfil_1';
    if (pathname.includes('/perfil-2')) return 'perfil_2';
    if (pathname.includes('/perfil-3')) return 'perfil_3';
    return 'principal';
};

const MAX_FACTURAS_SELECCIONADAS = 31;

type ConfiguracionSatResumen = {
    rfc: string;
    nombre: string;
    fielCargada: boolean;
} | null;

const ESTADO_SOLICITUD_STYLES: Record<string, string> = {
    PENDIENTE: 'bg-slate-700 text-slate-200',
    EN_PROCESO: 'bg-blue-900/50 text-blue-300',
    COMPLETADA: 'bg-green-900/50 text-green-400',
    SIN_RESULTADOS: 'bg-amber-900/50 text-amber-300',
    DUPLICADA: 'bg-fuchsia-900/50 text-fuchsia-300',
    RECHAZADA: 'bg-red-900/50 text-red-400',
    ERROR: 'bg-red-950/50 text-red-300',
    VENCIDA: 'bg-orange-900/50 text-orange-300',
    RESPALDO_REQUERIDO: 'bg-yellow-800/50 text-yellow-200',
    REINTENTO_MANANA: 'bg-purple-900/50 text-purple-200',
};

const CAT_FORMA_PAGO: Record<string, string> = {
    '01': '01 - Efectivo',
    '02': '02 - Cheque nominativo',
    '03': '03 - Transferencia electrónica de fondos',
    '04': '04 - Tarjeta de crédito',
    '28': '28 - Tarjeta de débito',
    '99': '99 - Por definir',
};

const CAT_METODO_PAGO: Record<string, string> = {
    PUE: 'PUE - Pago en una sola exhibición',
    PPD: 'PPD - Pago en parcialidades o diferido',
};

const CAT_TIPO_COMPROBANTE: Record<string, string> = {
    I: 'I - Ingreso',
    E: 'E - Egreso',
    T: 'T - Traslado',
    N: 'N - Nómina',
    P: 'P - Pago',
};

const CAT_MONEDA: Record<string, string> = {
    MXN: 'MXN - Peso Mexicano',
    USD: 'USD - Dólar americano',
    EUR: 'EUR - Euro',
};

const NumeroALetras = (num: number): string => {
    const Unidades = (n: number) => {
        switch (n) {
            case 1: return 'UN';
            case 2: return 'DOS';
            case 3: return 'TRES';
            case 4: return 'CUATRO';
            case 5: return 'CINCO';
            case 6: return 'SEIS';
            case 7: return 'SIETE';
            case 8: return 'OCHO';
            case 9: return 'NUEVE';
            default: return '';
        }
    };

    const Decenas = (n: number) => {
        const d = Math.floor(n / 10);
        const u = n - d * 10;

        switch (d) {
            case 1:
                switch (u) {
                    case 0: return 'DIEZ';
                    case 1: return 'ONCE';
                    case 2: return 'DOCE';
                    case 3: return 'TRECE';
                    case 4: return 'CATORCE';
                    case 5: return 'QUINCE';
                    default: return 'DIECI' + Unidades(u);
                }
            case 2:
                return u === 0 ? 'VEINTE' : 'VEINTI' + Unidades(u);
            case 3:
                return u > 0 ? 'TREINTA Y ' + Unidades(u) : 'TREINTA';
            case 4:
                return u > 0 ? 'CUARENTA Y ' + Unidades(u) : 'CUARENTA';
            case 5:
                return u > 0 ? 'CINCUENTA Y ' + Unidades(u) : 'CINCUENTA';
            case 6:
                return u > 0 ? 'SESENTA Y ' + Unidades(u) : 'SESENTA';
            case 7:
                return u > 0 ? 'SETENTA Y ' + Unidades(u) : 'SETENTA';
            case 8:
                return u > 0 ? 'OCHENTA Y ' + Unidades(u) : 'OCHENTA';
            case 9:
                return u > 0 ? 'NOVENTA Y ' + Unidades(u) : 'NOVENTA';
            case 0:
                return Unidades(u);
            default:
                return '';
        }
    };

    const Centenas = (n: number) => {
        const c = Math.floor(n / 100);
        const d = n - c * 100;

        switch (c) {
            case 1: return d > 0 ? 'CIENTO ' + Decenas(d) : 'CIEN';
            case 2: return 'DOSCIENTOS ' + Decenas(d);
            case 3: return 'TRESCIENTOS ' + Decenas(d);
            case 4: return 'CUATROCIENTOS ' + Decenas(d);
            case 5: return 'QUINIENTOS ' + Decenas(d);
            case 6: return 'SEISCIENTOS ' + Decenas(d);
            case 7: return 'SETECIENTOS ' + Decenas(d);
            case 8: return 'OCHOCIENTOS ' + Decenas(d);
            case 9: return 'NOVECIENTOS ' + Decenas(d);
            default: return Decenas(d);
        }
    };

    const Seccion = (n: number, div: number, strS: string, strP: string) => {
        const c = Math.floor(n / div);
        let letras = '';

        if (c > 0) {
            if (c > 1) letras = Centenas(c) + ' ' + strP;
            else letras = strS;
        }

        return letras;
    };

    const Miles = (n: number) => {
        const div = 1000;
        const r = n % div;
        const strMiles = Seccion(n, div, 'UN MIL', 'MIL');
        const strCentenas = Centenas(r);
        return strMiles === '' ? strCentenas : strMiles + ' ' + strCentenas;
    };

    const Millones = (n: number) => {
        const div = 1000000;
        const r = n % div;
        const strMillones = Seccion(n, div, 'UN MILLON', 'MILLONES');
        const strMiles = Miles(r);
        return strMillones === '' ? strMiles : strMillones + ' ' + strMiles;
    };

    const entero = Math.floor(num);
    const centavos = Math.round(num * 100) - entero * 100;
    const letrasCentavos = centavos.toString().padStart(2, '0') + '/100';

    if (entero === 0) return 'CERO PESOS ' + letrasCentavos;
    return Millones(entero) + ' PESOS ' + letrasCentavos;
};

const parseXmlToFactura = (xmlStr: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');

    const getAttr = (tagName: string, attrName: string) => {
        let nodes = xmlDoc.getElementsByTagNameNS('*', tagName);
        if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`cfdi:${tagName}`);
        if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`tfd:${tagName}`);
        return nodes.length > 0 ? nodes[0].getAttribute(attrName) || '' : '';
    };

    const conceptosNodes = xmlDoc.getElementsByTagNameNS('*', 'Concepto');
    const conceptos = Array.from(conceptosNodes).map((node: Element) => {
        let ivaTasa = 0.16;
        let ivaBase = parseFloat(node.getAttribute('Importe') || '0');
        let ivaImporte = 0;

        const traslado = node.getElementsByTagNameNS('*', 'Traslado')[0];
        if (traslado && traslado.getAttribute('Impuesto') === '002') {
            ivaTasa = parseFloat(traslado.getAttribute('TasaOCuota') || '0.16');
            if (traslado.hasAttribute('Base')) ivaBase = parseFloat(traslado.getAttribute('Base') || '0');
            if (traslado.hasAttribute('Importe')) ivaImporte = parseFloat(traslado.getAttribute('Importe') || '0');
        }

        return {
            claveProdServ: node.getAttribute('ClaveProdServ') || '',
            cantidad: parseFloat(node.getAttribute('Cantidad') || '0'),
            claveUnidad: node.getAttribute('ClaveUnidad') || '',
            unidad: node.getAttribute('Unidad') || '',
            descripcion: node.getAttribute('Descripcion') || '',
            valorUnitario: parseFloat(node.getAttribute('ValorUnitario') || '0'),
            importe: parseFloat(node.getAttribute('Importe') || '0'),
            objetoImpuesto: node.getAttribute('ObjetoImp') || '02',
            noIdentificacion: node.getAttribute('NoIdentificacion') || '',
            ivaTasa,
            ivaBase,
            ivaImporte,
        };
    });

    let iva = 0;
    const impuestosNodes = xmlDoc.getElementsByTagNameNS('*', 'Impuestos');
    for (let i = 0; i < impuestosNodes.length; i++) {
        const total = impuestosNodes[i].getAttribute('TotalImpuestosTrasladados');
        if (total) {
            iva = parseFloat(total);
            break;
        }
    }

    const uuid = getAttr('TimbreFiscalDigital', 'UUID');
    const fechaTimbrado = getAttr('TimbreFiscalDigital', 'FechaTimbrado');
    const rfcPac = getAttr('TimbreFiscalDigital', 'RfcProvCertif');
    const selloCfdi = getAttr('TimbreFiscalDigital', 'SelloCFD');
    const noCertificadoSat = getAttr('TimbreFiscalDigital', 'NoCertificadoSAT');
    const emisorRfc = getAttr('Emisor', 'Rfc');
    const receptorRfc = getAttr('Receptor', 'Rfc');
    const totalStr = getAttr('Comprobante', 'Total') || '0';

    const cadenaOriginal = `||1.1|${uuid}|${fechaTimbrado}|${rfcPac}|${selloCfdi}|${noCertificadoSat}||`;
    const ultimos8Sello = selloCfdi ? selloCfdi.slice(-8) : '';
    const qrUrlString = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${uuid}&re=${emisorRfc}&rr=${receptorRfc}&tt=${totalStr}&fe=${ultimos8Sello}`;
    const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrUrlString)}&size=150`;

    const formaPagoKey = getAttr('Comprobante', 'FormaPago');
    const metodoPagoKey = getAttr('Comprobante', 'MetodoPago');
    const tipoCompKey = getAttr('Comprobante', 'TipoDeComprobante');
    const monedaKey = getAttr('Comprobante', 'Moneda');

    return {
        folio: getAttr('Comprobante', 'Folio'),
        serie: getAttr('Comprobante', 'Serie'),
        fecha: getAttr('Comprobante', 'Fecha'),
        estado: 'TIMBRADO',
        uuid,
        selloCfdi,
        selloSat: getAttr('TimbreFiscalDigital', 'SelloSAT'),
        noCertificado: getAttr('Comprobante', 'NoCertificado'),
        noCertificadoSat,
        fechaTimbrado,
        rfcPac,
        cadenaOriginal,
        qrCodeUrl,
        emisor: {
            nombre: getAttr('Emisor', 'Nombre'),
            rfc: emisorRfc,
            regimenFiscal: getAttr('Emisor', 'RegimenFiscal'),
            cp: getAttr('Comprobante', 'LugarExpedicion'),
        },
        receptor: {
            nombre: getAttr('Receptor', 'Nombre'),
            rfc: receptorRfc,
            usoCfdi: getAttr('Receptor', 'UsoCFDI'),
            regimenFiscal: getAttr('Receptor', 'RegimenFiscalReceptor'),
            cp: getAttr('Receptor', 'DomicilioFiscalReceptor'),
        },
        conceptos,
        subtotal: parseFloat(getAttr('Comprobante', 'SubTotal') || '0'),
        iva,
        total: parseFloat(totalStr),
        totalLetra: NumeroALetras(parseFloat(totalStr)) + ' M.N.',
        moneda: CAT_MONEDA[monedaKey] || monedaKey,
        formaPago: CAT_FORMA_PAGO[formaPagoKey] || formaPagoKey,
        metodoPago: CAT_METODO_PAGO[metodoPagoKey] || metodoPagoKey,
        tipoComprobante: CAT_TIPO_COMPROBANTE[tipoCompKey] || tipoCompKey,
        exportacion: getAttr('Comprobante', 'Exportacion'),
    };
};

type SatLoginModalProps = {
    open: boolean;
    loading: boolean;
    perfil: PerfilClave;
    configSat: ConfiguracionSatResumen;
    onClose: () => void;
    onSubmit: (payload: {
        rfc: string;
        rfcNombre: string;
        password: string;
        cerFile: File | null;
        keyFile: File | null;
        usarConfiguracion?: boolean;
    }) => Promise<void>;
};

function SatLoginModal({ open, loading, perfil, configSat, onClose, onSubmit }: SatLoginModalProps) {
    const [rfc, setRfc] = useState('');
    const [rfcNombre, setRfcNombre] = useState('');
    const [password, setPassword] = useState('');
    const [cerFile, setCerFile] = useState<File | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const esPrincipal = perfil === 'principal';

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!rfc || !rfcNombre || !password || !cerFile || !keyFile) {
            alert('Debes capturar RFC, nombre registrado, contraseña y seleccionar ambos archivos .cer y .key');
            return;
        }

        await onSubmit({ rfc, rfcNombre, password, cerFile, keyFile });
    };

    const usarConfiguracion = async () => {
        if (!configSat?.fielCargada) {
            alert('No hay e.firma FIEL configurada.');
            return;
        }

        await onSubmit({
            rfc: configSat.rfc,
            rfcNombre: configSat.nombre,
            password: '',
            cerFile: null,
            keyFile: null,
            usarConfiguracion: true,
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                            <div>
                                <h2 className="text-xl font-bold">Conectar con SAT</h2>
                                <p className="text-sm text-slate-300">
                                    {PERFILES_DESCARGA[perfil].etiqueta}: inicia sesión con e.firma para descargar CFDI recibidos.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                            title="Cerrar"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                    {esPrincipal && configSat?.fielCargada && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-sm font-bold text-emerald-800">Usar e.firma configurada</div>
                                    <div className="text-xs text-emerald-700">
                                        SAT: {configSat.rfc} - {configSat.nombre || 'Nombre no capturado'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={usarConfiguracion}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500">RFC</label>
                            <input
                                type="text"
                                value={rfc}
                                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                                placeholder="COMO891216CM1"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-mono text-slate-700 uppercase"
                            />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Nombre de persona o empresa</label>
                            <input
                                type="text"
                                value={rfcNombre}
                                onChange={(e) => setRfcNombre(e.target.value)}
                                placeholder="Nombre registrado ante SAT"
                                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 text-slate-700"
                            />
                        </div>

                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                            <div className="text-sm font-bold text-slate-700">Subir archivo .CER</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {cerFile ? cerFile.name : 'Selecciona tu certificado'}
                            </div>
                            <input
                                type="file"
                                accept=".cer"
                                className="hidden"
                                onChange={(e) => setCerFile(e.target.files?.[0] || null)}
                            />
                        </label>

                        <label className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors cursor-pointer">
                            <UploadCloud className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                            <div className="text-sm font-bold text-slate-700">Subir archivo .KEY</div>
                            <div className="text-xs text-slate-500 mt-1">
                                {keyFile ? keyFile.name : 'Selecciona tu llave privada'}
                            </div>
                            <input
                                type="file"
                                accept=".key"
                                className="hidden"
                                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                            />
                        </label>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold uppercase text-slate-500">
                                Contraseña de la e.firma
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-blue-500 font-medium text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                        Esta sesión SAT se usará para consultar, verificar y descargar CFDI recibidos.
                    </div>

                    <div className="flex flex-wrap justify-between gap-3">
                        <Link
                            href="/facturas"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Regresar a facturas
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <ShieldCheck className="w-5 h-5" />
                            )}
                            Conectar SAT
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

type ConsolidadoModalProps = {
    open: boolean;
    loading: boolean;
    mes: string;
    facturas: FacturaRecibida[];
    onClose: () => void;
    onMesChange: (mes: string) => void;
    onDownload: () => Promise<void>;
    onSend: (correo: string) => Promise<void>;
};

function ConsolidadoModal({
    open,
    loading,
    mes,
    facturas,
    onClose,
    onMesChange,
    onDownload,
    onSend,
}: ConsolidadoModalProps) {
    const [correo, setCorreo] = useState('');
    const total = facturas.reduce((sum, factura) => sum + Number(factura.total || 0), 0);
    const proveedores = new Set(facturas.map((factura) => factura.emisorRfc)).size;

    if (!open) return null;

    const handleSend = async () => {
        if (!correo) {
            alert('Captura un correo destino.');
            return;
        }

        await onSend(correo);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="bg-slate-900 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <Archive className="h-7 w-7 text-indigo-300" />
                        <div>
                            <h2 className="text-xl font-bold">Consolidado mensual</h2>
                            <p className="text-sm text-slate-300">Genera un XLSX agrupado por proveedores y totales.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-5 p-6">
                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Mes a consolidar</span>
                        <input
                            type="month"
                            value={mes}
                            onChange={(e) => onMesChange(e.target.value)}
                            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 font-bold text-slate-700 outline-none focus:border-indigo-500"
                        />
                    </label>

                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-bold uppercase text-slate-400">Facturas</div>
                            <div className="mt-1 text-xl font-black text-slate-800">{facturas.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-bold uppercase text-slate-400">Proveedores</div>
                            <div className="mt-1 text-xl font-black text-slate-800">{proveedores}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-bold uppercase text-slate-400">Total</div>
                            <div className="mt-1 text-sm font-black text-blue-700">
                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}
                            </div>
                        </div>
                    </div>

                    <label className="block space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-500">Correo destino</span>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder="contador@empresa.com"
                            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-slate-700 outline-none focus:border-indigo-500"
                        />
                    </label>

                    <div className="flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onDownload}
                            disabled={loading || facturas.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            Descargar XLSX
                        </button>
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={loading || facturas.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function escapeXmlCell(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sheetXml(rows: Array<Array<string | number>>) {
    const rowXml = rows
        .map((row, rowIndex) => {
            const cells = row
                .map((value, colIndex) => {
                    const ref = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
                    if (typeof value === 'number') {
                        return `<c r="${ref}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
                    }
                    return `<c r="${ref}" t="inlineStr"><is><t>${escapeXmlCell(String(value || ''))}</t></is></c>`;
                })
                .join('');

            return `<row r="${rowIndex + 1}">${cells}</row>`;
        })
        .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

async function crearConsolidadoXlsx(facturas: FacturaRecibida[], mes: string) {
    const porProveedor = new Map<string, {
        rfc: string;
        nombre: string;
        cantidad: number;
        total: number;
        ultima: string;
    }>();

    const porDia = new Map<string, { fecha: string; cantidad: number; total: number; proveedores: Set<string> }>();

    for (const factura of facturas) {
        const total = Number(factura.total || 0);
        const keyProveedor = `${factura.emisorRfc}|${factura.emisorNombre}`;
        const proveedor = porProveedor.get(keyProveedor) || {
            rfc: factura.emisorRfc,
            nombre: factura.emisorNombre,
            cantidad: 0,
            total: 0,
            ultima: factura.fechaEmision,
        };

        proveedor.cantidad += 1;
        proveedor.total += total;
        if (new Date(factura.fechaEmision).getTime() > new Date(proveedor.ultima).getTime()) {
            proveedor.ultima = factura.fechaEmision;
        }
        porProveedor.set(keyProveedor, proveedor);

        const fecha = facturaFechaKey(factura);
        const dia = porDia.get(fecha) || { fecha, cantidad: 0, total: 0, proveedores: new Set<string>() };
        dia.cantidad += 1;
        dia.total += total;
        dia.proveedores.add(factura.emisorRfc);
        porDia.set(fecha, dia);
    }

    const totalGeneral = facturas.reduce((sum, factura) => sum + Number(factura.total || 0), 0);

    const resumenRows: Array<Array<string | number>> = [
        ['Consolidado de facturas recibidas'],
        ['Mes', mes],
        ['Facturas', facturas.length],
        ['Proveedores unicos', porProveedor.size],
        ['Total MXN', totalGeneral],
    ];

    const proveedorRows: Array<Array<string | number>> = [
        ['RFC emisor', 'Nombre emisor', 'Facturas', 'Total', 'Promedio', 'Ultima factura'],
        ...Array.from(porProveedor.values())
            .sort((a, b) => b.total - a.total)
            .map((item) => [
                item.rfc,
                item.nombre,
                item.cantidad,
                item.total,
                item.cantidad ? item.total / item.cantidad : 0,
                fechaCfdiKey(item.ultima),
            ]),
    ];

    const diaRows: Array<Array<string | number>> = [
        ['Fecha', 'Facturas', 'Proveedores unicos', 'Total'],
        ...Array.from(porDia.values())
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map((item) => [item.fecha, item.cantidad, item.proveedores.size, item.total]),
    ];

    const facturaRows: Array<Array<string | number>> = [
        ['Fecha', 'RFC emisor', 'Nombre emisor', 'UUID', 'Moneda', 'Total', 'Estado'],
        ...facturas.map((factura) => [
            facturaFechaKey(factura),
            factura.emisorRfc,
            factura.emisorNombre,
            factura.uuid,
            factura.moneda,
            Number(factura.total || 0),
            factura.estadoSat,
        ]),
    ];

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet4.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Proveedores" sheetId="2" r:id="rId2"/><sheet name="Dias" sheetId="3" r:id="rId3"/><sheet name="Facturas" sheetId="4" r:id="rId4"/></sheets></workbook>`);
    zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet4.xml"/></Relationships>`);
    const worksheets = zip.folder('xl')?.folder('worksheets');
    worksheets?.file('sheet1.xml', sheetXml(resumenRows));
    worksheets?.file('sheet2.xml', sheetXml(proveedorRows));
    worksheets?.file('sheet3.xml', sheetXml(diaRows));
    worksheets?.file('sheet4.xml', sheetXml(facturaRows));

    return zip.generateAsync({ type: 'blob' });
}

function extraerFechaCfdi(xmlContenido?: string) {
    if (!xmlContenido) return '';
    const match = xmlContenido.match(/<(?:\w+:)?Comprobante[^>]*\sFecha=["']([^"']+)["']/i);
    return match?.[1] || '';
}

function fechaCfdiKey(fecha: string) {
    if (!fecha) return '';
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return fecha.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(parsed);
}

function facturaFechaKey(factura: FacturaRecibida) {
    return fechaCfdiKey(extraerFechaCfdi(factura.xmlContenido) || factura.fechaEmision);
}

function paginasVisibles(actual: number, total: number) {
    const paginas = new Set<number>([1, total]);
    for (let page = actual - 2; page <= actual + 2; page++) {
        if (page >= 1 && page <= total) paginas.add(page);
    }
    return Array.from(paginas).sort((a, b) => a - b);
}

export default function FacturasRecibidasPage() {
    const pathname = usePathname();
    const perfilClave = perfilFromPath(pathname || '');
    const perfilActual = PERFILES_DESCARGA[perfilClave];
    const [facturas, setFacturas] = useState<FacturaRecibida[]>([]);
    const [solicitudes, setSolicitudes] = useState<SolicitudSAT[]>([]);
    const [loading, setLoading] = useState(true);
    const [sincronizando, setSincronizando] = useState(false);
    const [q, setQ] = useState('');
    const [mesVista, setMesVista] = useState(() => new Date().toISOString().slice(0, 7));
    const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 10;
    const SOLICITUDES_POR_PAGINA = 10;
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [paginaHistorial, setPaginaHistorial] = useState(1);
    const [historialInicio, setHistorialInicio] = useState('');
    const [historialFin, setHistorialFin] = useState('');
    const [mostrarLoginSat, setMostrarLoginSat] = useState(false);
    const [satSesionActiva, setSatSesionActiva] = useState(false);
    const [satRfc, setSatRfc] = useState('');
    const [satRfcNombre, setSatRfcNombre] = useState('');
    const [configSat, setConfigSat] = useState<ConfiguracionSatResumen>(null);
    const [loginSatCargando, setLoginSatCargando] = useState(false);
    const [mostrarConsolidado, setMostrarConsolidado] = useState(false);
    const [mesConsolidado, setMesConsolidado] = useState(() => new Date().toISOString().slice(0, 7));
    const [consolidadoCargando, setConsolidadoCargando] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const verificandoRef = useRef(false);

    const hoy = new Date().toISOString().split('T')[0];
    const haceUnaSemana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const [fechaInicio, setFechaInicio] = useState(haceUnaSemana);
    const [fechaFin, setFechaFin] = useState(hoy);

    const cargar = useCallback(async () => {
        setLoading(true);

        try {
            const timestamp = new Date().getTime();

            const resFacturas = await fetch(`/api/facturas-recibidas?perfil=${perfilClave}&t=${timestamp}`, {
                cache: 'no-store',
            });
            const dataFacturas = await resFacturas.json();
            setFacturas(Array.isArray(dataFacturas) ? dataFacturas : []);

            const resSolicitudes = await fetch(`/api/facturas-recibidas/solicitudes?perfil=${perfilClave}&t=${timestamp}`, {
                cache: 'no-store',
            });
            const dataSolicitudes = await resSolicitudes.json();
            setSolicitudes(Array.isArray(dataSolicitudes) ? dataSolicitudes : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [perfilClave]);

    const cargarSesionSat = useCallback(async () => {
        try {
            const res = await fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, { cache: 'no-store' });
            const data = await res.json();

            setSatSesionActiva(Boolean(data.activa));
            setSatRfc(data.rfc || '');
            setSatRfcNombre(data.rfcNombre || data.perfil?.rfcNombre || '');
            setConfigSat(data.configuracion || null);
            setMostrarLoginSat(!data.activa);
        } catch {
            setSatSesionActiva(false);
            setSatRfc('');
            setSatRfcNombre('');
            setConfigSat(null);
            setMostrarLoginSat(true);
        }
    }, [perfilClave]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    useEffect(() => {
        void cargarSesionSat();
    }, [cargarSesionSat]);

    useEffect(() => {
        setPaginaActual(1);
    }, [q, mesVista]);

    useEffect(() => {
        setPaginaHistorial(1);
    }, [historialInicio, historialFin, mostrarHistorial]);

    const esSolicitudVerificable = useCallback((s: SolicitudSAT) => {
        return s.estado === 'PENDIENTE' || s.estado === 'EN_PROCESO';
    }, []);

    const marcarSolicitudesComoVerificando = useCallback(() => {
        setSolicitudes((prev) =>
            prev.map((s) =>
                esSolicitudVerificable(s)
                    ? {
                        ...s,
                        estado: s.estado === 'COMPLETADA' ? 'EN_PROCESO' : 'EN_PROCESO',
                        mensajeSat: 'Consultando estado con SAT...',
                    }
                    : s
            )
        );
    }, [esSolicitudVerificable]);

    const verificarDescargas = useCallback(
        async ({ silent = false, background = false }: { silent?: boolean; background?: boolean } = {}) => {
            if (verificandoRef.current) return;

            verificandoRef.current = true;

            if (!background) {
                setSincronizando(true);
            }

            marcarSolicitudesComoVerificando();

            try {
                const res = await fetch(`/api/facturas-recibidas/verificar?perfil=${perfilClave}`, {
                    method: 'GET',
                    cache: 'no-store',
                });

                const data = await res.json();

                if (!res.ok) {
                    if (!silent) {
                        alert(`❌ Error: ${data.error || 'No se pudo comprobar con SAT.'}`);
                    }
                    await cargar();
                    return;
                }

                await cargar();

                if (!silent && data.mensaje) {
                    alert(`ℹ️ ${data.mensaje}`);
                }
            } catch (error) {
                console.error(error);
                if (!silent) {
                    alert('Error al comprobar descargas.');
                }
            } finally {
                verificandoRef.current = false;
                if (!background) {
                    setSincronizando(false);
                }
            }
        },
        [cargar, marcarSolicitudesComoVerificando, perfilClave]
    );

    const handleLoginSat = async ({
        rfc,
        rfcNombre,
        password,
        cerFile,
        keyFile,
        usarConfiguracion,
    }: {
        rfc: string;
        rfcNombre: string;
        password: string;
        cerFile: File | null;
        keyFile: File | null;
        usarConfiguracion?: boolean;
    }) => {
        setLoginSatCargando(true);

        try {
            const formData = new FormData();
            formData.append('perfil', perfilClave);
            formData.append('rfc', rfc);
            formData.append('rfcNombre', rfcNombre);
            formData.append('password', password);
            if (usarConfiguracion) formData.append('usarConfiguracion', 'true');
            if (cerFile) formData.append('cer', cerFile);
            if (keyFile) formData.append('key', keyFile);

            const res = await fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error SAT: ${data.error}`);
                return;
            }

            setSatSesionActiva(true);
            setSatRfc(data.rfc || rfc);
            setSatRfcNombre(data.rfcNombre || rfcNombre);
            setMostrarLoginSat(false);
            alert('✅ Sesión SAT iniciada correctamente.');
        } catch {
            alert('No fue posible iniciar sesión con SAT.');
        } finally {
            setLoginSatCargando(false);
        }
    };

    const handleCerrarSesionSat = async () => {
        try {
            const res = await fetch(`/api/facturas-recibidas/sesion?perfil=${perfilClave}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error: ${data.error || 'No se pudo cerrar la sesión SAT.'}`);
                return;
            }

            setSatSesionActiva(false);
            setSatRfc('');
            setSatRfcNombre('');
            setMostrarLoginSat(true);
            alert('✅ Sesión SAT cerrada.');
        } catch {
            alert('No fue posible cerrar la sesión SAT.');
        }
    };

    const handleSincronizar = async () => {
        setSincronizando(true);

        try {
            const res = await fetch('/api/facturas-recibidas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fechaInicio, fechaFin, perfil: perfilClave }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Atención: ${data.error}`);
                return;
            }

            alert(`✅ ${data.mensaje}\nLa verificación queda en segundo plano. Se enviará correo cuando las facturas entren al sistema.`);
            await cargar();
        } catch {
            alert('Error de conexión al sincronizar con el SAT.');
        } finally {
            setSincronizando(false);
        }
    };

    const handleVerificarDescargas = async () => {
        await verificarDescargas({ silent: false, background: false });
    };

    const handleSubirXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setSincronizando(true);

        try {
            const file = e.target.files[0];
            const text = await file.text();

            const res = await fetch('/api/facturas-recibidas/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xmlContenido: text, perfil: perfilClave }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error: ${data.error}`);
            } else {
                alert(`✅ ${data.mensaje}`);
            }

            await cargar();
        } catch {
            alert('Error al leer el archivo XML.');
        } finally {
            setSincronizando(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDescargarXML = (f: FacturaRecibida) => {
        if (!f.xmlContenido) {
            alert('XML no disponible.');
            return;
        }

        const blob = new Blob([f.xmlContenido], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `${f.emisorRfc}_${f.uuid}.xml`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDescargarPDF = async (f: FacturaRecibida) => {
        if (!f.xmlContenido) {
            alert('No hay XML guardado para generar el PDF.');
            return;
        }

        try {
            const facturaParseada = parseXmlToFactura(f.xmlContenido);
            const doc = <FacturaPDF factura={facturaParseada} /> as Parameters<typeof pdf>[0];
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();
            saveAs(blob, `${f.emisorRfc}_${f.uuid}.pdf`);
        } catch (error) {
            console.error(error);
            alert('Error al armar el PDF de esta factura.');
        }
    };

    const crearZipFacturas = async (facturasZip: FacturaRecibida[]) => {
        const zip = new JSZip();
        let agregadas = 0;

        facturasZip.forEach((f) => {
            if (f.xmlContenido) {
                zip.file(`${f.emisorRfc}_${f.uuid}.xml`, f.xmlContenido);
                agregadas++;
            }
        });

        if (agregadas === 0) {
            throw new Error('No hay XML disponibles en base de datos para descargar.');
        }

        return zip.generateAsync({ type: 'blob' });
    };

    const crearPdfUnidoFacturas = async (facturasPdf: FacturaRecibida[]) => {
        const mergedPdf = await PDFDocument.create();
        let agregadas = 0;

        for (const factura of facturasPdf) {
            if (!factura.xmlContenido) continue;

            const facturaParseada = parseXmlToFactura(factura.xmlContenido);
            const doc = <FacturaPDF factura={facturaParseada} /> as Parameters<typeof pdf>[0];
            const blob = await pdf(doc).toBlob();
            const singlePdf = await PDFDocument.load(await blob.arrayBuffer());
            const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            agregadas++;
        }

        if (agregadas === 0) {
            throw new Error('No hay XML disponibles para generar PDF.');
        }

        const pdfBytes = await mergedPdf.save();
        const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
        return new Blob([pdfBuffer], { type: 'application/pdf' });
    };

    const blobToBase64 = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

    const handleDescargarSeleccionadas = async () => {
        if (facturasSeleccionadas.length === 0) {
            alert('Selecciona al menos una factura.');
            return;
        }

        if (facturasSeleccionadas.length > MAX_FACTURAS_SELECCIONADAS) {
            alert(`Sólo puedes descargar hasta ${MAX_FACTURAS_SELECCIONADAS} facturas seleccionadas.`);
            return;
        }

        try {
            const zipBlob = await crearZipFacturas(facturasSeleccionadas);
            saveAs(zipBlob, `Facturas_recibidas_${perfilClave}_${new Date().toISOString().slice(0, 10)}.zip`);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo preparar el ZIP.');
        }
    };

    const handleDescargarConsolidado = async () => {
        const facturasMes = facturas.filter((f) => facturaFechaKey(f).slice(0, 7) === mesConsolidado);

        if (facturasMes.length === 0) {
            alert('No hay facturas para el mes seleccionado.');
            return;
        }

        setConsolidadoCargando(true);

        try {
            const xlsxBlob = await crearConsolidadoXlsx(facturasMes, mesConsolidado);
            saveAs(xlsxBlob, `Consolidado_facturas_recibidas_${perfilClave}_${mesConsolidado}.xlsx`);
        } catch (error) {
            console.error(error);
            alert('No se pudo generar el XLSX.');
        } finally {
            setConsolidadoCargando(false);
        }
    };

    const handleEnviarConsolidado = async (correo: string) => {
        const facturasMes = facturas.filter((f) => facturaFechaKey(f).slice(0, 7) === mesConsolidado);

        if (facturasMes.length === 0) {
            alert('No hay facturas para el mes seleccionado.');
            return;
        }

        setConsolidadoCargando(true);

        try {
            const xlsxBlob = await crearConsolidadoXlsx(facturasMes, mesConsolidado);
            const zipBlob = await crearZipFacturas(facturasMes);
            const pdfBlob = await crearPdfUnidoFacturas(facturasMes);
            const xlsxBase64 = await blobToBase64(xlsxBlob);
            const zipBase64 = await blobToBase64(zipBlob);
            const pdfBase64 = await blobToBase64(pdfBlob);
            const res = await fetch('/api/facturas-recibidas/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinatario: correo,
                    attachments: [
                        {
                            filename: `Consolidado_facturas_recibidas_${perfilClave}_${mesConsolidado}.xlsx`,
                            content: xlsxBase64,
                            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        },
                        {
                            filename: `XML_facturas_recibidas_${perfilClave}_${mesConsolidado}.zip`,
                            content: zipBase64,
                            contentType: 'application/zip',
                        },
                        {
                            filename: `PDF_facturas_recibidas_${perfilClave}_${mesConsolidado}.pdf`,
                            content: pdfBase64,
                            contentType: 'application/pdf',
                        },
                    ],
                    asunto: `Consolidado facturas recibidas ${mesConsolidado}`,
                    titulo: `Consolidado facturas recibidas ${mesConsolidado}`,
                    descripcion: `Adjunto encontrarás el XLSX, el ZIP de XML y el PDF unido de ${facturasMes.length} facturas recibidas.`,
                    facturas: facturasMes.map((f) => ({
                        uuid: f.uuid,
                        emisorRfc: f.emisorRfc,
                        emisorNombre: f.emisorNombre,
                        fechaEmision: f.fechaEmision,
                        total: Number(f.total),
                        moneda: f.moneda,
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(`❌ Error: ${data.error || 'No se pudo enviar el consolidado.'}`);
                return;
            }

            alert(`✅ ${data.mensaje}`);
            setMostrarConsolidado(false);
        } catch (error) {
            console.error(error);
            alert('No se pudo enviar el consolidado.');
        } finally {
            setConsolidadoCargando(false);
        }
    };

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    const fmtFecha = (d: string) => fechaCfdiKey(d).split('-').reverse().join('/');

    const fmtMes = (mes: string) => {
        if (!mes) return 'Todos los meses';
        const [anio, month] = mes.split('-').map(Number);
        return new Date(anio, month - 1, 1).toLocaleDateString('es-MX', {
            month: 'long',
            year: 'numeric',
        });
    };

    const facturasFiltradas = facturas.filter((f) => {
        const busqueda = q.toLowerCase();
        const keyDia = facturaFechaKey(f);
        const keyMes = keyDia.slice(0, 7);
        const fechaTexto = new Date(`${keyDia}T12:00:00`).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).toLowerCase();

        if (mesVista && keyMes !== mesVista) return false;

        return (
            !q ||
            f.emisorNombre.toLowerCase().includes(busqueda) ||
            f.emisorRfc.toLowerCase().includes(busqueda) ||
            f.uuid.toLowerCase().includes(busqueda) ||
            keyDia.includes(busqueda) ||
            keyMes.includes(busqueda) ||
            fechaTexto.includes(busqueda)
        );
    }).sort((a, b) => facturaFechaKey(a).localeCompare(facturaFechaKey(b)));

    const totalPaginas = Math.ceil(facturasFiltradas.length / ITEMS_POR_PAGINA);
    const startIndex = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const facturasPaginadas = facturasFiltradas.slice(startIndex, startIndex + ITEMS_POR_PAGINA);
    const facturasSeleccionadas = facturas.filter((f) => seleccionadas.includes(f.id));
    const idsPaginados = facturasPaginadas.map((f) => f.id);
    const totalMes = facturasFiltradas.reduce((sum, f) => sum + Number(f.total || 0), 0);
    const totalSeleccionado = facturasSeleccionadas.reduce((sum, f) => sum + Number(f.total || 0), 0);
    const facturasConsolidadoMes = facturas.filter((f) => facturaFechaKey(f).slice(0, 7) === mesConsolidado);

    const gruposPorDia = facturasPaginadas.reduce<Record<string, FacturaRecibida[]>>((acc, factura) => {
        const key = facturaFechaKey(factura);
        acc[key] = acc[key] || [];
        acc[key].push(factura);
        return acc;
    }, {});

    const solicitudesFiltradas = solicitudes.filter((solicitud) => {
        const inicio = solicitud.fechaInicio.slice(0, 10);
        const fin = solicitud.fechaFin.slice(0, 10);
        if (historialInicio && fin < historialInicio) return false;
        if (historialFin && inicio > historialFin) return false;
        return true;
    });
    const totalPaginasHistorial = Math.max(1, Math.ceil(solicitudesFiltradas.length / SOLICITUDES_POR_PAGINA));
    const solicitudesPaginadas = solicitudesFiltradas.slice(
        (paginaHistorial - 1) * SOLICITUDES_POR_PAGINA,
        paginaHistorial * SOLICITUDES_POR_PAGINA
    );

    const toggleSeleccion = (id: string) => {
        setSeleccionadas((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : prev.length >= MAX_FACTURAS_SELECCIONADAS
                    ? (alert(`Sólo puedes seleccionar hasta ${MAX_FACTURAS_SELECCIONADAS} facturas.`), prev)
                    : [...prev, id]
        );
    };

    const toggleSeleccionIds = (ids: string[]) => {
        setSeleccionadas((prev) => {
            const todosSeleccionados = ids.length > 0 && ids.every((id) => prev.includes(id));
            if (todosSeleccionados) return prev.filter((id) => !ids.includes(id));
            const next = Array.from(new Set([...prev, ...ids])).slice(0, MAX_FACTURAS_SELECCIONADAS);
            if (next.length < new Set([...prev, ...ids]).size) {
                alert(`Sólo puedes seleccionar hasta ${MAX_FACTURAS_SELECCIONADAS} facturas.`);
            }
            return next;
        });
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6 pb-24">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" /> Panel
                        </Link>
                        <Inbox className="w-8 h-8 text-pink-600 ml-2" />
                        <div>
                            <h1 className="text-3xl font-bold">{perfilActual.titulo}</h1>
                            <p className="text-sm font-medium text-slate-500">{perfilActual.etiqueta}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${satSesionActiva
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-xs font-bold">
                                {satSesionActiva ? `SAT: ${satRfc}${satRfcNombre ? ` - ${satRfcNombre}` : ''}` : 'SAT no conectado'}
                            </span>
                        </div>

                        <button
                            onClick={() => setMostrarLoginSat(true)}
                            className="flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-xl hover:bg-slate-900 transition-all font-bold text-xs shadow-sm"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {satSesionActiva ? 'Cambiar e.firma' : 'Conectar SAT'}
                        </button>

                        {satSesionActiva && (
                            <button
                                onClick={handleCerrarSesionSat}
                                className="flex items-center gap-2 bg-white text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-bold text-xs shadow-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {Object.entries(PERFILES_DESCARGA).map(([clave, perfil]) => (
                        <Link
                            key={clave}
                            href={perfil.ruta}
                            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${clave === perfilClave
                                ? 'border-pink-200 bg-pink-50 text-pink-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {perfil.etiqueta}
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-pink-50 p-2 rounded-xl">
                                <Inbox className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Flujo SAT</h2>
                                <p className="text-xs text-slate-500">Solicita el rango y deja que el sistema compruebe en segundo plano.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-end gap-2">
                            <label className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold uppercase text-slate-400">De</span>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-400"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold uppercase text-slate-400">A</span>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-400"
                                />
                            </label>

                            <button
                                onClick={handleSincronizar}
                                disabled={sincronizando || !satSesionActiva}
                                className="h-10 flex items-center gap-2 bg-pink-600 text-white px-4 rounded-xl hover:bg-pink-700 transition-all font-bold text-sm shadow-lg shadow-pink-100 disabled:opacity-50"
                            >
                                {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
                                Pedir al SAT
                            </button>

                            <button
                                onClick={handleVerificarDescargas}
                                disabled={sincronizando || !satSesionActiva}
                                className="h-10 flex items-center gap-2 bg-emerald-600 text-white px-4 rounded-xl hover:bg-emerald-700 transition-all font-bold text-sm shadow-lg shadow-emerald-100 disabled:opacity-50"
                            >
                                {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Comprobar
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-cyan-50 p-2 rounded-xl">
                                <Archive className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800">Herramientas</h2>
                                <p className="text-xs text-slate-500">Trabaja con el mes visible o con la selección.</p>
                            </div>
                        </div>

                        <input
                            type="file"
                            accept=".xml"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleSubirXML}
                        />

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setMostrarConsolidado(true)}
                                className="h-10 flex items-center gap-2 bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-lg shadow-indigo-100"
                            >
                                <Archive className="w-4 h-4" /> Consolidado
                            </button>

                            <Link
                                href="/facturas-recibidas/consolidado"
                                className="h-10 flex items-center gap-2 bg-rose-600 text-white px-4 rounded-xl hover:bg-rose-700 transition-all font-bold text-sm shadow-lg shadow-rose-100"
                            >
                                <Archive className="w-4 h-4" /> Consolidado global
                            </Link>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={sincronizando}
                                className="h-10 flex items-center gap-2 bg-amber-500 text-white px-4 rounded-xl hover:bg-amber-600 transition-all font-bold text-sm shadow-lg shadow-amber-100 disabled:opacity-50"
                            >
                                <FileCode className="w-4 h-4" /> Subir XML
                            </button>

                            <button
                                onClick={() => setMostrarHistorial(true)}
                                className="h-10 flex items-center gap-2 bg-white text-slate-600 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all font-bold text-sm shadow-sm"
                            >
                                <Clock className="w-4 h-4" /> Historial SAT
                            </button>
                        </div>
                    </div>
                </div>

                {mostrarHistorial && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                        <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-800 text-white shadow-2xl">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-6 py-5">
                                <h3 className="flex items-center gap-2 font-bold">
                                    <Clock className="h-5 w-5 text-blue-400" />
                                    Historial SAT
                                </h3>
                                <button
                                    onClick={() => setMostrarHistorial(false)}
                                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="flex flex-wrap items-end gap-3 border-b border-slate-700 px-6 py-4">
                                <label className="space-y-1">
                                    <span className="text-[11px] font-bold uppercase text-slate-400">Desde</span>
                                    <input
                                        type="date"
                                        value={historialInicio}
                                        onChange={(e) => setHistorialInicio(e.target.value)}
                                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none"
                                    />
                                </label>
                                <label className="space-y-1">
                                    <span className="text-[11px] font-bold uppercase text-slate-400">Hasta</span>
                                    <input
                                        type="date"
                                        value={historialFin}
                                        onChange={(e) => setHistorialFin(e.target.value)}
                                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none"
                                    />
                                </label>
                                <button
                                    onClick={() => {
                                        setHistorialInicio('');
                                        setHistorialFin('');
                                    }}
                                    className="h-10 rounded-xl border border-slate-600 px-4 text-sm font-bold text-slate-200 hover:bg-slate-700"
                                >
                                    Limpiar
                                </button>
                            </div>

                            <div className="overflow-auto px-6 py-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-700 text-slate-400">
                                        <tr>
                                            <th className="pb-2">Fecha solicitada</th>
                                            <th className="pb-2">Token</th>
                                            <th className="pb-2">Estado</th>
                                            <th className="pb-2">Mensaje SAT</th>
                                            <th className="pb-2">Creado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {solicitudesPaginadas.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-500">
                                                    No hay peticiones en este filtro.
                                                </td>
                                            </tr>
                                        ) : null}

                                        {solicitudesPaginadas.map((s) => (
                                            <tr key={s.id}>
                                                <td className="py-3 font-medium">
                                                    {fmtFecha(s.fechaInicio)} - {fmtFecha(s.fechaFin)}
                                                </td>
                                                <td className="py-3 pr-4 font-mono text-xs text-blue-300 break-all">
                                                    {s.requestId}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${ESTADO_SOLICITUD_STYLES[s.estado] || 'bg-slate-700 text-slate-200'}`}>
                                                        {s.estado}
                                                    </span>
                                                </td>
                                                <td className="max-w-md py-3 text-xs text-slate-300">
                                                    {s.mensajeSat || 'Sin mensaje del SAT todavía.'}
                                                </td>
                                                <td className="py-3 text-slate-400">
                                                    {new Date(s.createdAt).toLocaleString('es-MX')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-700 px-6 py-4">
                                <span className="text-sm text-slate-400">
                                    Página {paginaHistorial} de {totalPaginasHistorial} | {solicitudesFiltradas.length} solicitudes
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setPaginaHistorial((p) => Math.max(1, p - 1))}
                                        disabled={paginaHistorial === 1}
                                        className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                                    >
                                        Anterior
                                    </button>
                                    {paginasVisibles(paginaHistorial, totalPaginasHistorial).map((page, index, pages) => (
                                        <React.Fragment key={page}>
                                            {index > 0 && page - pages[index - 1] > 1 ? (
                                                <span className="px-2 py-2 text-sm font-bold text-slate-500">...</span>
                                            ) : null}
                                            <button
                                                onClick={() => setPaginaHistorial(page)}
                                                className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${page === paginaHistorial
                                                    ? 'border-blue-400 bg-blue-500 text-white'
                                                    : 'border-slate-600 text-slate-200 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                    <button
                                        onClick={() => setPaginaHistorial((p) => Math.min(totalPaginasHistorial, p + 1))}
                                        disabled={paginaHistorial === totalPaginasHistorial}
                                        className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                        <label className="flex-1">
                            <span className="text-[11px] font-bold uppercase text-slate-400">Buscar</span>
                            <div className="mt-1 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11">
                                <Search className="w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Proveedor, RFC, UUID, fecha o mes..."
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="w-full outline-none text-slate-700 bg-transparent text-sm"
                                />
                            </div>
                        </label>

                        <label>
                            <span className="text-[11px] font-bold uppercase text-slate-400">Mes visible</span>
                            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 h-11">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <input
                                    type="month"
                                    value={mesVista}
                                    onChange={(e) => setMesVista(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </label>

                        <button
                            onClick={() => setMesVista('')}
                            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50"
                        >
                            Ver todo
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-bold text-slate-800 capitalize">{fmtMes(mesVista)}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">{facturasFiltradas.length} facturas</span>
                            <span className="font-mono font-bold text-blue-700">{fmt(totalMes)}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">{facturasSeleccionadas.length} seleccionadas</span>
                            <span className="font-mono font-bold text-emerald-700">{fmt(totalSeleccionado)}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => toggleSeleccionIds(idsPaginados)}
                                disabled={idsPaginados.length === 0}
                                className="h-9 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                {idsPaginados.length > 0 && idsPaginados.every((id) => seleccionadas.includes(id))
                                    ? 'Quitar pagina'
                                    : 'Seleccionar pagina'}
                            </button>

                            <button
                                onClick={handleDescargarSeleccionadas}
                                disabled={facturasSeleccionadas.length === 0 || facturasSeleccionadas.length > MAX_FACTURAS_SELECCIONADAS}
                                className="h-9 flex items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                Descargar seleccionadas
                            </button>

                            {seleccionadas.length > 0 && (
                                <button
                                    onClick={() => setSeleccionadas([])}
                                    className="h-9 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-600 hover:bg-red-100"
                                >
                                    Limpiar selección
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {['', 'Fecha', 'Proveedor / RFC', 'UUID', 'Total', 'Estado', 'Acciones'].map((h) => (
                                        <th key={h || 'select'} className="px-5 py-4 text-sm font-bold uppercase text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : facturasPaginadas.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-500">
                                            No hay facturas recibidas sincronizadas.
                                        </td>
                                    </tr>
                                ) : (
                                    Object.entries(gruposPorDia).map(([dia, facturasDia]) => {
                                        const idsDia = facturasDia.map((f) => f.id);
                                        const diaSeleccionado = idsDia.every((id) => seleccionadas.includes(id));
                                        const totalDia = facturasDia.reduce((sum, f) => sum + Number(f.total || 0), 0);

                                        return (
                                            <React.Fragment key={dia}>
                                                <tr className="bg-slate-100/80">
                                                    <td colSpan={7} className="px-5 py-3">
                                                        <label className="flex flex-wrap items-center justify-between gap-3 cursor-pointer">
                                                            <span className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={diaSeleccionado}
                                                                    onChange={() => toggleSeleccionIds(idsDia)}
                                                                    className="w-4 h-4 accent-blue-600"
                                                                />
                                                                <span className="font-bold text-slate-800">
                                                                    {new Date(`${dia}T12:00:00`).toLocaleDateString('es-MX', {
                                                                        weekday: 'long',
                                                                        day: '2-digit',
                                                                        month: 'long',
                                                                        year: 'numeric',
                                                                    })}
                                                                </span>
                                                            </span>
                                                            <span className="text-sm text-slate-500">
                                                                {facturasDia.length} facturas | <span className="font-mono font-bold text-blue-700">{fmt(totalDia)}</span>
                                                            </span>
                                                        </label>
                                                    </td>
                                                </tr>

                                                {facturasDia.map((f) => (
                                                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={seleccionadas.includes(f.id)}
                                                                onChange={() => toggleSeleccion(f.id)}
                                                                className="w-4 h-4 accent-blue-600"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4 text-slate-600">{fmtFecha(f.fechaEmision)}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-slate-800">{f.emisorNombre}</div>
                                                            <div className="text-sm font-mono text-slate-500 uppercase">{f.emisorRfc}</div>
                                                        </td>
                                                        <td className="px-5 py-4 text-xs font-mono text-slate-500">{f.uuid}</td>
                                                        <td className="px-5 py-4 font-mono font-bold text-blue-700">
                                                            {fmt(Number(f.total))}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span
                                                                className={`px-3 py-1 rounded-lg text-xs font-bold ${f.estadoSat === 'VIGENTE'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-red-100 text-red-600'
                                                                    }`}
                                                            >
                                                                {f.estadoSat}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleDescargarXML(f)}
                                                                    title="Descargar XML"
                                                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                                >
                                                                    <FileCode className="w-5 h-5" />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDescargarPDF(f)}
                                                                    title="Descargar PDF"
                                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <FileText className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between mt-auto">
                            <span className="text-sm text-slate-500 font-medium">
                                Página {paginaActual} de {totalPaginas}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                    disabled={paginaActual === 1}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                {paginasVisibles(paginaActual, totalPaginas).map((page, index, pages) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && page - pages[index - 1] > 1 ? (
                                            <span className="px-2 py-2 text-sm font-bold text-slate-400">...</span>
                                        ) : null}
                                        <button
                                            onClick={() => setPaginaActual(page)}
                                            className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${page === paginaActual
                                                ? 'border-pink-300 bg-pink-600 text-white'
                                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))}
                                <button
                                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                                    disabled={paginaActual === totalPaginas}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SatLoginModal
                open={mostrarLoginSat}
                loading={loginSatCargando}
                perfil={perfilClave}
                configSat={configSat}
                onClose={() => setMostrarLoginSat(false)}
                onSubmit={handleLoginSat}
            />

            <ConsolidadoModal
                open={mostrarConsolidado}
                loading={consolidadoCargando}
                mes={mesConsolidado}
                facturas={facturasConsolidadoMes}
                onClose={() => setMostrarConsolidado(false)}
                onMesChange={setMesConsolidado}
                onDownload={handleDescargarConsolidado}
                onSend={handleEnviarConsolidado}
            />
        </div>
    );
}
