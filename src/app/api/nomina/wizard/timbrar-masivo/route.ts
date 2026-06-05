import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { getActiveConfig, getCsdCredentials, registrarTimbreUsado } from '@/lib/configuracion';
import { generarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/generarXMLNomina';
import { validarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/validarXMLNomina';
import { generarCadenaOriginal, inyectarCertificado, inyectarSello, sellarCadena } from '@/lib/nomina/sellado';
import { enviarAPAC } from '@/lib/nomina/pac';
import { registrarTimbreUso } from '@/lib/timbres';
import { getCertificadoBase64, getNoCertificado, keyToPem } from '@/lib/sat/firmar';
import { obtenerDatosEmpleadoNomina, obtenerDatosEmisorNomina, armarPeriodoNomina } from '@/lib/nomina/armado';

export async function POST(req: NextRequest) {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const { reciboId } = await req.json();
    if (!reciboId) return NextResponse.json({ error: 'reciboId requerido.' }, { status: 400 });

    const [config, csd, recibo] = await Promise.all([
      getActiveConfig(),
      getCsdCredentials(),
      prisma.reciboNomina.findUnique({
        where: { id: String(reciboId) },
        include: { empleado: true, percepciones: true, deducciones: true },
      }),
    ]);

    if (!config) return NextResponse.json({ error: 'Guarda primero el perfil fiscal.' }, { status: 400 });
    if (!csd) return NextResponse.json({ error: 'Carga y activa los sellos CSD antes de timbrar nómina.' }, { status: 400 });
    if (!recibo) return NextResponse.json({ error: 'Recibo no encontrado.' }, { status: 404 });
    if (recibo.estado === 'TIMBRADO') {
      return NextResponse.json({ ok: true, reciboId: recibo.id, uuid: recibo.uuid, estado: 'TIMBRADO' });
    }
    if (recibo.estado !== 'BORRADOR' && recibo.estado !== 'ERROR') {
      return NextResponse.json({ error: 'Solo se pueden timbrar recibos en borrador o error.' }, { status: 409 });
    }

    const certificado = getCertificadoBase64(csd.certificadoBase64);
    const noCertificado = getNoCertificado(csd.certificadoBase64);
    const keyPem = keyToPem(csd.llaveBase64, csd.password);

    const periodo = armarPeriodoNomina(
      recibo.fechaInicialPago.toISOString().slice(0, 10),
      recibo.fechaFinalPago.toISOString().slice(0, 10),
    );

    let xml = generarXMLNomina({
      emisor: obtenerDatosEmisorNomina(config),
      receptor: {
        rfc: recibo.empleado.rfc,
        nombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno} ${recibo.empleado.apellidoMaterno || ''}`.trim(),
        domicilioFiscal: recibo.empleado.cp,
        regimenFiscalReceptor: '605',
        usoCFDI: 'CN01',
      },
      empleado: obtenerDatosEmpleadoNomina(recibo.empleado, periodo.fechaFinal),
      periodo,
      percepciones: recibo.percepciones.map((p) => ({
        tipo: p.tipoPercepcion,
        clave: p.clave,
        concepto: p.concepto,
        gravado: Number(p.importeGravado),
        exento: Number(p.importeExento),
      })),
      deducciones: recibo.deducciones.map((d) => ({
        tipo: d.tipoDeduccion,
        clave: d.clave,
        concepto: d.concepto,
        importe: Number(d.importe),
      })),
      serie: config.folioNominaSerie || 'NOM',
      folio: recibo.id.slice(0, 10),
    });

    xml = inyectarCertificado(xml, { certificado, noCertificado });

    const errores = validarXMLNomina(xml);
    if (errores.length) {
      const mensajeError = errores.map((e) => `${e.codigo}: ${e.mensaje}`).join('\n');
      await prisma.$transaction([
        prisma.reciboNomina.update({ where: { id: recibo.id }, data: { estado: 'ERROR', mensajeError } }),
        prisma.registroTimbrado.create({
          data: {
            reciboNominaId: recibo.id,
            estatus: 'VALIDACION',
            pac: config.pacProveedor,
            ambiente: config.pacAmbiente,
            mensajeError,
            xmlGenerado: xml,
          },
        }),
      ]);
      return NextResponse.json({ error: 'El XML de nómina no pasó validación.', errores }, { status: 400 });
    }

    await prisma.reciboNomina.update({ where: { id: recibo.id }, data: { estado: 'TIMBRANDO', mensajeError: null } });

    let xmlTimbrado = '';
    let uuid: string | null = null;
    try {
      const cadena = await generarCadenaOriginal(xml);
      const sello = sellarCadena(cadena, keyPem);
      xml = inyectarSello(xml, { sello });
      console.log(`\n========== CADENA ORIGINAL NOMINA recibo=${recibo.id} ==========`);
      console.log(cadena);
      console.log(`========== FIN CADENA ORIGINAL NOMINA recibo=${recibo.id} ==========\n`);
      console.log(`\n========== XML NOMINA FIRMADO PARA FINKOK recibo=${recibo.id} ==========`);
      console.log(xml);
      console.log(`========== FIN XML NOMINA FIRMADO recibo=${recibo.id} ==========\n`);
      xmlTimbrado = await enviarAPAC(xml);
      uuid = xmlTimbrado.match(/UUID="([^"]+)"/)?.[1] || null;
    } catch (error: unknown) {
      const mensajeError = error instanceof Error ? error.message : 'Error al timbrar nómina.';
      await prisma.$transaction([
        prisma.reciboNomina.update({ where: { id: recibo.id }, data: { estado: 'ERROR', mensajeError } }),
        prisma.registroTimbrado.create({
          data: {
            reciboNominaId: recibo.id,
            estatus: 'FALLIDO',
            pac: config.pacProveedor,
            ambiente: config.pacAmbiente,
            mensajeError,
            xmlGenerado: xml,
            requestPayload: xml,
          },
        }),
      ]);
      return NextResponse.json({ error: mensajeError }, { status: 500 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.reciboNomina.update({
        where: { id: recibo.id },
        data: { estado: 'TIMBRADO', uuid, xmlTimbrado, mensajeError: null },
      });
      await tx.registroTimbrado.create({
        data: {
          reciboNominaId: recibo.id,
          estatus: 'EXITOSO',
          pac: config.pacProveedor,
          ambiente: config.pacAmbiente,
          xmlGenerado: xml,
          xmlTimbrado,
          uuid,
          timbradoEn: new Date(),
        },
      });
      await registrarTimbreUsado(tx);
      await registrarTimbreUso(tx, {
        uuid,
        tipoCfdi: 'NOMINA',
        reciboNominaId: recibo.id,
        emisorRfc: config.rfc,
        emisorNombre: config.razonSocial,
        receptorRfc: recibo.empleado.rfc,
        receptorNombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno} ${recibo.empleado.apellidoMaterno || ''}`.trim(),
        serie: config.folioNominaSerie || 'NOM',
        folio: recibo.id.slice(0, 10),
        total: recibo.totalNeto,
        pac: config.pacProveedor,
        ambiente: config.pacAmbiente,
      });
    });

    return NextResponse.json({ ok: true, reciboId: recibo.id, uuid });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al timbrar nómina.' }, { status: 500 });
  }
}
