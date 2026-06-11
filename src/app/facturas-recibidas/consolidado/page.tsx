'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Archive, Download, Loader2, Search, Send } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { FacturaPDF } from '@/lib/pdf/FacturaPDF';

type FacturaConsolidado = {
    id: string;
    uuid: string;
    perfilClave: string;
    perfilNombre: string;
    emisorRfc: string;
    emisorNombre: string;
    receptorRfc: string;
    fechaEmision: string;
    fechaKey: string;
    total: number;
    moneda: string;
    estadoSat: string;
    xmlContenido?: string;
};

const fmt = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

function escapeXmlCell(value: string) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sheetXml(rows: Array<Array<string | number>>) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, colIndex) => {
        const ref = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        return typeof value === 'number'
            ? `<c r="${ref}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t>${escapeXmlCell(String(value || ''))}</t></is></c>`;
    }).join('')}</row>`).join('')}</sheetData></worksheet>`;
}

async function crearXlsx(facturas: FacturaConsolidado[], mes: string) {
    const porReceptorPerfil = new Map<string, { receptorRfc: string; perfil: string; facturas: number; total: number }>();

    facturas.forEach((factura) => {
        const key = `${factura.receptorRfc}|${factura.perfilNombre}`;
        const item = porReceptorPerfil.get(key) || {
            receptorRfc: factura.receptorRfc,
            perfil: factura.perfilNombre,
            facturas: 0,
            total: 0,
        };
        item.facturas += 1;
        item.total += Number(factura.total || 0);
        porReceptorPerfil.set(key, item);
    });

    const rows: Array<Array<string | number>> = [
        ['Consolidado global de facturas recibidas'],
        ['Mes', mes || 'Todos'],
        ['Facturas', facturas.length],
        ['RFC receptores', new Set(facturas.map((f) => f.receptorRfc)).size],
        ['Total', facturas.reduce((sum, f) => sum + Number(f.total || 0), 0)],
        [],
        ['RFC receptor', 'Modulo', 'Facturas', 'Total'],
        ...Array.from(porReceptorPerfil.values()).map((item) => [item.receptorRfc, item.perfil, item.facturas, item.total]),
        [],
        ['Fecha', 'RFC receptor', 'Modulo', 'RFC emisor', 'Nombre emisor', 'UUID', 'Total', 'Moneda', 'Estado'],
        ...facturas.map((f) => [f.fechaKey, f.receptorRfc, f.perfilNombre, f.emisorRfc, f.emisorNombre, f.uuid, Number(f.total || 0), f.moneda, f.estadoSat]),
    ];

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    zip.folder('xl')?.file('workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Consolidado" sheetId="1" r:id="rId1"/></sheets></workbook>`);
    zip.folder('xl')?.folder('_rels')?.file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
    zip.folder('xl')?.folder('worksheets')?.file('sheet1.xml', sheetXml(rows));

    return zip.generateAsync({ type: 'blob' });
}

function getAttr(xmlDoc: Document, tagName: string, attrName: string) {
    let nodes = xmlDoc.getElementsByTagNameNS('*', tagName);
    if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`cfdi:${tagName}`);
    if (nodes.length === 0) nodes = xmlDoc.getElementsByTagName(`tfd:${tagName}`);
    return nodes.length > 0 ? nodes[0].getAttribute(attrName) || '' : '';
}

function parseXmlParaPdf(xmlStr: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
    const conceptosNodes = xmlDoc.getElementsByTagNameNS('*', 'Concepto');
    const conceptos = Array.from(conceptosNodes).map((node: Element) => ({
        claveProdServ: node.getAttribute('ClaveProdServ') || '',
        cantidad: Number(node.getAttribute('Cantidad') || 0),
        claveUnidad: node.getAttribute('ClaveUnidad') || '',
        unidad: node.getAttribute('Unidad') || '',
        descripcion: node.getAttribute('Descripcion') || '',
        valorUnitario: Number(node.getAttribute('ValorUnitario') || 0),
        importe: Number(node.getAttribute('Importe') || 0),
        objetoImpuesto: node.getAttribute('ObjetoImp') || '',
        ivaTasa: 0.16,
        ivaBase: Number(node.getAttribute('Importe') || 0),
        ivaImporte: 0,
    }));

    let iva = 0;
    Array.from(xmlDoc.getElementsByTagNameNS('*', 'Impuestos')).some((node) => {
        const total = node.getAttribute('TotalImpuestosTrasladados');
        if (total) {
            iva = Number(total || 0);
            return true;
        }
        return false;
    });

    const uuid = getAttr(xmlDoc, 'TimbreFiscalDigital', 'UUID');
    const emisorRfc = getAttr(xmlDoc, 'Emisor', 'Rfc');
    const receptorRfc = getAttr(xmlDoc, 'Receptor', 'Rfc');
    const total = Number(getAttr(xmlDoc, 'Comprobante', 'Total') || 0);

    return {
        folio: getAttr(xmlDoc, 'Comprobante', 'Folio'),
        serie: getAttr(xmlDoc, 'Comprobante', 'Serie'),
        fecha: getAttr(xmlDoc, 'Comprobante', 'Fecha'),
        estado: 'TIMBRADO',
        uuid,
        emisor: {
            nombre: getAttr(xmlDoc, 'Emisor', 'Nombre'),
            rfc: emisorRfc,
            regimenFiscal: getAttr(xmlDoc, 'Emisor', 'RegimenFiscal'),
            cp: getAttr(xmlDoc, 'Comprobante', 'LugarExpedicion'),
        },
        receptor: {
            nombre: getAttr(xmlDoc, 'Receptor', 'Nombre'),
            rfc: receptorRfc,
            usoCfdi: getAttr(xmlDoc, 'Receptor', 'UsoCFDI'),
            regimenFiscal: getAttr(xmlDoc, 'Receptor', 'RegimenFiscalReceptor'),
            cp: getAttr(xmlDoc, 'Receptor', 'DomicilioFiscalReceptor'),
        },
        conceptos,
        subtotal: Number(getAttr(xmlDoc, 'Comprobante', 'SubTotal') || 0),
        iva,
        total,
        moneda: getAttr(xmlDoc, 'Comprobante', 'Moneda') || 'MXN',
        formaPago: getAttr(xmlDoc, 'Comprobante', 'FormaPago'),
        metodoPago: getAttr(xmlDoc, 'Comprobante', 'MetodoPago'),
        tipoComprobante: getAttr(xmlDoc, 'Comprobante', 'TipoDeComprobante'),
        selloCfdi: getAttr(xmlDoc, 'TimbreFiscalDigital', 'SelloCFD'),
        selloSat: getAttr(xmlDoc, 'TimbreFiscalDigital', 'SelloSAT'),
        noCertificado: getAttr(xmlDoc, 'Comprobante', 'NoCertificado'),
        noCertificadoSat: getAttr(xmlDoc, 'TimbreFiscalDigital', 'NoCertificadoSAT'),
        fechaTimbrado: getAttr(xmlDoc, 'TimbreFiscalDigital', 'FechaTimbrado'),
        rfcPac: getAttr(xmlDoc, 'TimbreFiscalDigital', 'RfcProvCertif'),
    };
}

const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

async function crearZipXml(facturas: FacturaConsolidado[]) {
    const zip = new JSZip();
    facturas.forEach((factura) => {
        if (!factura.xmlContenido) return;
        const folder = zip.folder(`${factura.receptorRfc}/${factura.perfilNombre}`);
        folder?.file(`${factura.emisorRfc}_${factura.uuid}.xml`, factura.xmlContenido);
    });
    return zip.generateAsync({ type: 'blob' });
}

async function crearPdfUnido(facturas: FacturaConsolidado[]) {
    const mergedPdf = await PDFDocument.create();
    let agregadas = 0;
    for (const factura of facturas) {
        if (!factura.xmlContenido) continue;
        const doc = <FacturaPDF factura={parseXmlParaPdf(factura.xmlContenido)} /> as Parameters<typeof pdf>[0];
        const blob = await pdf(doc).toBlob();
        const singlePdf = await PDFDocument.load(await blob.arrayBuffer());
        const pages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
        agregadas++;
    }
    if (agregadas === 0) throw new Error('No hay XML disponibles para generar PDF.');
    const pdfBytes = await mergedPdf.save();
    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new Blob([pdfBuffer], { type: 'application/pdf' });
}

export default function ConsolidadoFacturasRecibidasPage() {
    const [facturas, setFacturas] = useState<FacturaConsolidado[]>([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
    const [rfc, setRfc] = useState('');
    const [q, setQ] = useState('');
    const [correo, setCorreo] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (mes) params.set('mes', mes);
            if (rfc) params.set('rfc', rfc);
            if (q) params.set('q', q);
            const res = await fetch(`/api/facturas-recibidas/consolidado?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            setFacturas(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, [mes, q, rfc]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const receptores = useMemo(() => Array.from(new Set(facturas.map((f) => f.receptorRfc))).sort(), [facturas]);
    const total = facturas.reduce((sum, factura) => sum + Number(factura.total || 0), 0);
    const grupos = useMemo(() => {
        const data = new Map<string, FacturaConsolidado[]>();
        facturas.forEach((factura) => {
            const key = `${factura.receptorRfc} | ${factura.perfilNombre}`;
            data.set(key, [...(data.get(key) || []), factura]);
        });
        return Array.from(data.entries());
    }, [facturas]);

    const prepararArchivos = async () => {
        if (facturas.length === 0) throw new Error('No hay facturas en el filtro actual.');
        const xlsx = await crearXlsx(facturas, mes);
        const zip = await crearZipXml(facturas);
        const pdfBlob = await crearPdfUnido(facturas);
        return { xlsx, zip, pdfBlob };
    };

    const descargar = async () => {
        setProcesando(true);
        try {
            const archivos = await prepararArchivos();
            saveAs(archivos.xlsx, `Consolidado_recibidas_${mes || 'todos'}.xlsx`);
            saveAs(archivos.zip, `XML_recibidas_${mes || 'todos'}.zip`);
            saveAs(archivos.pdfBlob, `PDF_recibidas_${mes || 'todos'}.pdf`);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo generar el consolidado.');
        } finally {
            setProcesando(false);
        }
    };

    const enviar = async () => {
        if (!correo) {
            alert('Captura un correo destino.');
            return;
        }
        setProcesando(true);
        try {
            const archivos = await prepararArchivos();
            const res = await fetch('/api/facturas-recibidas/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinatario: correo,
                    asunto: `Consolidado global facturas recibidas ${mes || 'todos'}`,
                    titulo: `Consolidado global facturas recibidas ${mes || 'todos'}`,
                    descripcion: `Adjunto encontrarás XLSX, ZIP de XML y PDF unido de ${facturas.length} facturas recibidas.`,
                    attachments: [
                        { filename: `Consolidado_recibidas_${mes || 'todos'}.xlsx`, content: await blobToBase64(archivos.xlsx), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                        { filename: `XML_recibidas_${mes || 'todos'}.zip`, content: await blobToBase64(archivos.zip), contentType: 'application/zip' },
                        { filename: `PDF_recibidas_${mes || 'todos'}.pdf`, content: await blobToBase64(archivos.pdfBlob), contentType: 'application/pdf' },
                    ],
                    facturas: facturas.map((factura) => ({
                        uuid: factura.uuid,
                        emisorRfc: factura.emisorRfc,
                        emisorNombre: factura.emisorNombre,
                        fechaEmision: factura.fechaKey,
                        total: factura.total,
                        moneda: factura.moneda,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No se pudo enviar el correo.');
            alert(`✅ ${data.mensaje}`);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'No se pudo enviar el consolidado.');
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 text-slate-800">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-1.5 font-bold text-slate-500 hover:text-blue-600">
                            <ArrowLeft className="h-5 w-5" /> Panel
                        </Link>
                        <Archive className="h-8 w-8 text-pink-600" />
                        <div>
                            <h1 className="text-3xl font-bold">Consolidado de facturas recibidas</h1>
                            <p className="text-sm font-medium text-slate-500">Todos los RFC receptores del general y RFC-1, RFC-2, RFC-3.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[170px_190px_1fr_260px_auto_auto] lg:items-end">
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-400">Mes</span>
                        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-bold outline-none" />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-400">RFC receptor</span>
                        <input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} list="rfcs-recibidas" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono font-bold uppercase outline-none" />
                        <datalist id="rfcs-recibidas">{receptores.map((item) => <option key={item} value={item} />)}</datalist>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-400">Buscar cliente/proveedor/UUID</span>
                        <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent outline-none" />
                        </div>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase text-slate-400">Correo destino</span>
                        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none" />
                    </label>
                    <button onClick={descargar} disabled={procesando || facturas.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Descargar
                    </button>
                    <button onClick={enviar} disabled={procesando || facturas.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                        {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-400">Facturas</div><div className="text-2xl font-black">{facturas.length}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-400">RFC receptores</div><div className="text-2xl font-black">{new Set(facturas.map((f) => f.receptorRfc)).size}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-400">Módulos</div><div className="text-2xl font-black">{new Set(facturas.map((f) => f.perfilNombre)).size}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-400">Total</div><div className="text-2xl font-black text-blue-700">{fmt(total)}</div></div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
                    ) : grupos.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No hay facturas recibidas en este filtro.</div>
                    ) : (
                        grupos.map(([grupo, items]) => (
                            <div key={grupo} className="border-b border-slate-100 last:border-b-0">
                                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 px-5 py-3">
                                    <div className="font-bold">{grupo}</div>
                                    <div className="font-mono text-sm font-bold text-blue-700">{items.length} facturas | {fmt(items.reduce((sum, f) => sum + f.total, 0))}</div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white text-xs uppercase text-slate-400">
                                            <tr>
                                                <th className="px-5 py-3">Fecha</th>
                                                <th className="px-5 py-3">Proveedor</th>
                                                <th className="px-5 py-3">UUID</th>
                                                <th className="px-5 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map((factura) => (
                                                <tr key={factura.id}>
                                                    <td className="px-5 py-3">{factura.fechaKey}</td>
                                                    <td className="px-5 py-3"><div className="font-bold">{factura.emisorNombre}</div><div className="font-mono text-xs text-slate-500">{factura.emisorRfc}</div></td>
                                                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{factura.uuid}</td>
                                                    <td className="px-5 py-3 text-right font-mono font-bold text-blue-700">{fmt(factura.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
