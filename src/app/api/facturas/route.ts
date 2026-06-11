import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActiveConfig } from '@/lib/configuracion';
import { normalizarObjetoImp } from '@/lib/sat/timbrar';
import { normalizarTipoComprobante } from '@/lib/sat/tipos-comprobante';
import {
  normalizeHidrocarburosProductInput,
  validateHidrocarburosFactura,
} from '@/modules/cfdi-complements/hidrocarburos';

type FacturaConceptoPayload = {
  productId?: string | null;
  claveProdServ?: string;
  noIdentificacion?: string | null;
  claveUnidad?: string;
  unidad?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  objetoImpuesto?: string;
  ivaTasa: number;
  iepsTasa?: number;
  requiresHypComplement?: boolean;
  hypClave?: string | null;
  hypSubproducto?: string | null;
};

// ─── GET /api/facturas ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');
  const estado = searchParams.get('estado');
  const desde = searchParams.get('desde');
  const hasta = searchParams.get('hasta');
  const q = searchParams.get('q');

  const where: Prisma.FacturaWhereInput = {};
  if (clientId) where.clientId = clientId;
  if (estado) where.estado = estado;
  if (q) where.OR = [
    { serie: { contains: q, mode: 'insensitive' } },
    { folio: { contains: q, mode: 'insensitive' } },
  ];
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }

  const facturas = await prisma.factura.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: true,
      conceptos: true,
    },
  });

  return NextResponse.json(facturas);
}

// ─── POST /api/facturas ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      serie, folio, fecha, formaPago, metodoPago, moneda, tipoCambio,
      condicionesPago, notas, clienteId, usoCFDI,
      retencionIVAPct, retencionISRPct, conceptos, emisorCp,
      esGlobal, periodicidad, mes, anio, cotizacionId, tipoComprobante // <-- Añadido soporte para cotizaciones
    } = body;

    const serieFinal = esGlobal ? 'FAG' : String(serie || 'FAC').trim() || 'FAC';
    const tipoComprobanteFinal = esGlobal ? 'I' : normalizarTipoComprobante(tipoComprobante);
    let clienteIdFinal = clienteId;

    const config = await getActiveConfig();
    const lugarExpedicionFinal = emisorCp || config?.codigoPostal;

    if (!lugarExpedicionFinal) {
      return NextResponse.json({ error: 'Configura el código postal del emisor antes de crear facturas.' }, { status: 400 });
    }

    if (esGlobal) {
      let clienteGlobal = await prisma.client.findFirst({
        where: { rfc: 'XAXX010101000' }
      });

      if (!clienteGlobal) {
        clienteGlobal = await prisma.client.create({
          data: {
            rfc: 'XAXX010101000',
            nombreRazonSocial: 'PUBLICO EN GENERAL',
            regimenFiscal: '616',
            cp: lugarExpedicionFinal,
            usoCfdiDefault: 'S01'
          }
        });
      } else if (clienteGlobal.cp !== lugarExpedicionFinal || clienteGlobal.regimenFiscal !== '616' || clienteGlobal.usoCfdiDefault !== 'S01') {
        clienteGlobal = await prisma.client.update({
          where: { id: clienteGlobal.id },
          data: {
            cp: lugarExpedicionFinal,
            regimenFiscal: '616',
            usoCfdiDefault: 'S01',
          },
        });
      }
      clienteIdFinal = clienteGlobal.id;
    }

    const conceptosInput: FacturaConceptoPayload[] = Array.isArray(conceptos) ? conceptos : [];
    let subtotal = 0, totalIVA = 0, totalIEPS = 0, totalDescuento = 0;
    const productIds = Array.from(new Set(conceptosInput.map((c) => c.productId).filter((id): id is string => Boolean(id))));
    const productosCatalogo = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const productosPorId = new Map(productosCatalogo.map((product) => [product.id, product]));

    for (const c of conceptosInput) {
      const objetoImpuesto = normalizarObjetoImp(c.objetoImpuesto);
      const importeConcepto = c.cantidad * c.precioUnitario;
      const baseImpuesto = importeConcepto - (c.descuento || 0);

      const iva = objetoImpuesto !== '01' ? baseImpuesto * c.ivaTasa : 0;
      const ieps = objetoImpuesto !== '01' ? baseImpuesto * Number(c.iepsTasa || 0) : 0;

      subtotal += importeConcepto;
      totalIVA += iva;
      totalIEPS += ieps;
      totalDescuento += c.descuento || 0;
    }

    const baseRetenciones = subtotal - totalDescuento;
    const retencionIVA = baseRetenciones * ((retencionIVAPct || 0) / 100);
    const retencionISR = baseRetenciones * ((retencionISRPct || 0) / 100);
    const total = subtotal - totalDescuento + totalIVA + totalIEPS - retencionIVA - retencionISR;

    const client = await prisma.client.findUnique({ where: { id: clienteIdFinal } });
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    // ── MAGIA: BUSCAR SI EL BORRADOR YA EXISTE ──
    const facturaExistente = await prisma.factura.findFirst({
      where: { serie: serieFinal, folio: String(folio) },
    });

    let factura;

    const conceptosFormateados = conceptosInput.map((c) => {
      const producto = c.productId ? productosPorId.get(c.productId) : null;
      const claveProdServ = String(c.claveProdServ || producto?.claveProdServ || '').trim();
      const hyp = normalizeHidrocarburosProductInput({
        claveProdServ,
        claveUnidad: c.claveUnidad || producto?.claveUnidad,
        unidad: c.unidad || producto?.unidad,
        requiresHypComplement: c.requiresHypComplement ?? producto?.requiresHypComplement,
        hypClave: c.hypClave || producto?.hypClave,
        hypSubproducto: c.hypSubproducto || producto?.hypSubproducto,
      });
      const objetoImpuesto = normalizarObjetoImp(c.objetoImpuesto);
      const importe = c.cantidad * c.precioUnitario;
      const baseImp = importe - (c.descuento || 0);
      const ivaImporte = objetoImpuesto !== '01' ? baseImp * c.ivaTasa : 0;
      const iepsImporte = objetoImpuesto !== '01' ? baseImp * Number(c.iepsTasa || 0) : 0;

      return {
        productId: c.productId || null,
        claveProdServ,
        noIdentificacion: c.noIdentificacion || null,
        claveUnidad: hyp.claveUnidad,
        unidad: hyp.unidad,
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        precioUnitario: c.precioUnitario,
        descuento: c.descuento || 0,
        importe,
        objetoImpuesto,
        ivaTasa: c.ivaTasa,
        iepsTasa: c.iepsTasa || 0,
        ivaImporte,
        iepsImporte,
        requiresHypComplement: hyp.requiresHypComplement,
        hypClave: hyp.hypClave,
        hypSubproducto: hyp.hypSubproducto,
        hypTipoPermiso: hyp.requiresHypComplement ? config?.hypTipoPermiso || null : null,
        hypNumeroPermiso: hyp.requiresHypComplement ? config?.hypNumeroPermiso || null : null,
      };
    });

    const erroresHyp = validateHidrocarburosFactura({
      tipoComprobante: tipoComprobanteFinal,
      emisor: {
        hypEnabled: config?.hypEnabled,
        hypTipoPermiso: config?.hypTipoPermiso,
        hypNumeroPermiso: config?.hypNumeroPermiso,
      },
      conceptos: conceptosFormateados,
    });

    if (erroresHyp.length) {
      return NextResponse.json({ error: erroresHyp.join(' ') }, { status: 400 });
    }

    if (facturaExistente) {
      // Si la factura ya se timbró en el SAT, bloqueamos cambios
      if (facturaExistente.estado !== 'BORRADOR') {
        return NextResponse.json({ error: 'Ya existe una factura TIMBRADA o CANCELADA con esa serie y folio' }, { status: 409 });
      }

      // 1. Borramos los conceptos viejos de la base de datos
      await prisma.conceptoFactura.deleteMany({
        where: { facturaId: facturaExistente.id },
      });

      // 2. Actualizamos la misma factura con los nuevos datos y nuevos ítems
      factura = await prisma.factura.update({
        where: { id: facturaExistente.id },
        data: {
          serie: serieFinal,
          fecha: new Date(fecha),
          lugarExpedicion: lugarExpedicionFinal,
          formaPago,
          metodoPago,
          moneda,
          tipoCambio,
          tipoComprobante: tipoComprobanteFinal,
          condicionesPago: condicionesPago || null,
          notas: notas || null,
          clientId: clienteIdFinal,
          cotizacionId: cotizacionId || null,
          usoCFDI,
          subtotal,
          descuento: totalDescuento,
          totalIVA,
          totalIEPS,
          retencionIVA,
          retencionISR,
          total,
          esGlobal: esGlobal || false,
          periodicidad: periodicidad || null,
          mes: mes || null,
          anio: anio ? Number(anio) : null,
          conceptos: {
            create: conceptosFormateados, // Metemos los nuevos ítems
          },
        },
        include: {
          client: true,
          conceptos: true,
        }
      });
    } else {
      // Si no existe (es la primera vez que le das a "Revisar"), la creamos normal
      factura = await prisma.factura.create({
        data: {
          serie: serieFinal,
          folio: String(folio),
          fecha: new Date(fecha),
          lugarExpedicion: lugarExpedicionFinal,
          formaPago,
          metodoPago,
          moneda,
          tipoCambio,
          tipoComprobante: tipoComprobanteFinal,
          condicionesPago: condicionesPago || null,
          notas: notas || null,
          clientId: clienteIdFinal,
          cotizacionId: cotizacionId || null,
          usoCFDI,
          subtotal,
          descuento: totalDescuento,
          totalIVA,
          totalIEPS,
          retencionIVA,
          retencionISR,
          total,
          estado: 'BORRADOR',
          esGlobal: esGlobal || false,
          periodicidad: periodicidad || null,
          mes: mes || null,
          anio: anio ? Number(anio) : null,
          conceptos: {
            create: conceptosFormateados,
          },
        },
        include: {
          client: true,
          conceptos: true,
        }
      });
    }

    return NextResponse.json(factura, { status: 201 });
  } catch (err: unknown) {
    console.error('❌ Error al crear/actualizar factura:', err);
    if (typeof err === 'object' && err && 'code' in err && err.code === 'P2002') return NextResponse.json({ error: 'Ya existe una factura con esa serie y folio' }, { status: 409 });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
