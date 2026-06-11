import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timbrarFactura, DatosFactura, normalizarObjetoImp } from '@/lib/sat/timbrar';
import { getActiveConfig, registrarTimbreUsado } from '@/lib/configuracion';
import { registrarTimbreUso } from '@/lib/timbres';
import { normalizarTipoComprobante } from '@/lib/sat/tipos-comprobante';
import { validateHidrocarburosFactura } from '@/modules/cfdi-complements/hidrocarburos';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        client: true,
        conceptos: true,
      },
    });

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    if (factura.estado === 'TIMBRADO') {
      return NextResponse.json(
        { error: 'La factura ya está timbrada' },
        { status: 400 }
      );
    }

    const tipoComprobante = normalizarTipoComprobante(factura.tipoComprobante);
    if (tipoComprobante === 'P') {
      return NextResponse.json(
        { error: 'El tipo P - Pago requiere complemento de pagos 2.0. Crea el borrador, pero el timbrado necesita el flujo de pagos relacionado.' },
        { status: 400 }
      );
    }

    const erroresHyp = validateHidrocarburosFactura({
      tipoComprobante,
      emisor: {},
      conceptos: factura.conceptos,
    });

    if (erroresHyp.length) {
      return NextResponse.json({ error: erroresHyp.join(' ') }, { status: 400 });
    }

    const datosParaTimbrar: DatosFactura = {
      serie: factura.serie,
      folio: factura.folio,
      fecha: factura.fecha,
      lugarExpedicion: factura.lugarExpedicion,
      formaPago: factura.formaPago,
      metodoPago: factura.metodoPago,
      moneda: factura.moneda,
      tipoCambio: Number(factura.tipoCambio),
      condicionesPago: factura.condicionesPago,
      tipoComprobante,
      subtotal: Number(factura.subtotal),
      descuento: Number(factura.descuento),
      totalIVA: Number(factura.totalIVA),
      totalIEPS: Number(factura.totalIEPS),
      retencionIVA: Number(factura.retencionIVA),
      retencionISR: Number(factura.retencionISR),
      total: Number(factura.total),
      usoCFDI: factura.usoCFDI,
      client: {
        rfc: factura.client.rfc,
        nombreRazonSocial: factura.client.nombreRazonSocial,
        regimenFiscal: factura.client.regimenFiscal,
        cp: factura.client.cp,
      },
      esGlobal: factura.esGlobal,
      periodicidad: factura.periodicidad || undefined,
      mes: factura.mes || undefined,
      anio: factura.anio || undefined,
      conceptos: factura.conceptos.map((c) => ({
        noIdentificacion: c.noIdentificacion || undefined,
        claveProdServ: c.claveProdServ,
        claveUnidad: c.claveUnidad,
        unidad: c.unidad,
        descripcion: c.descripcion,
        cantidad: Number(c.cantidad),
        precioUnitario: Number(c.precioUnitario),
        descuento: Number(c.descuento),
        importe: Number(c.importe),
        objetoImpuesto: normalizarObjetoImp(c.objetoImpuesto),
        ivaTasa: Number(c.ivaTasa),
        iepsTasa: Number(c.iepsTasa),
        ivaImporte: Number(c.ivaImporte),
        iepsImporte: Number(c.iepsImporte),
        requiresHypComplement: c.requiresHypComplement,
        hypClave: c.hypClave || undefined,
        hypSubproducto: c.hypSubproducto || undefined,
        hypTipoPermiso: c.hypTipoPermiso || undefined,
        hypNumeroPermiso: c.hypNumeroPermiso || undefined,
      })),
    };

    const resultado = await timbrarFactura(datosParaTimbrar);
    const config = await getActiveConfig();

    const facturaActualizada = await prisma.$transaction(async (tx) => {
      const actualizada = await tx.factura.update({
        where: { id: factura.id },
        data: {
          estado: 'TIMBRADO',
          uuid: resultado.uuid,
          xmlTimbrado: resultado.xmlTimbrado,
        },
        include: {
          client: true,
          conceptos: true,
        },
      });
      await registrarTimbreUsado(tx);
      await registrarTimbreUso(tx, {
        uuid: resultado.uuid,
        tipoCfdi: 'FACTURA',
        facturaId: factura.id,
        emisorRfc: config?.rfc || '',
        emisorNombre: config?.razonSocial || '',
        receptorRfc: factura.client.rfc,
        receptorNombre: factura.client.nombreRazonSocial,
        serie: factura.serie,
        folio: factura.folio,
        total: factura.total,
        pac: config?.pacProveedor,
        ambiente: config?.pacAmbiente,
      });
      return actualizada;
    });

    return NextResponse.json({
      ok: true,
      uuid: resultado.uuid,
      xmlTimbrado: resultado.xmlTimbrado,
      noCertificadoSAT: resultado.noCertificadoSAT,
      factura: facturaActualizada,
    });
  } catch (error: unknown) {
    console.error('Error en ruta timbrar:', error);
    const message = error instanceof Error ? error.message : 'Error interno al timbrar';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
