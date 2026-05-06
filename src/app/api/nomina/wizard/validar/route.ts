import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireModule } from '@/lib/auth/session-server';
import { generarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/generarXMLNomina';
import { validarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/validarXMLNomina';
import { obtenerDatosEmpleadoNomina, obtenerDatosEmisorNomina, armarPeriodoNomina } from '@/lib/nomina/armado';
import { getActiveConfig } from '@/lib/configuracion';

type ValidationItem = {
  id: string;
  empleadoNombre: string;
  estado: 'OK' | 'ERROR';
  errores: ReturnType<typeof validarXMLNomina>;
};

export async function POST(req: NextRequest) {
  const guard = await requireModule('nomina');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const { reciboIds } = await req.json();
    const ids = Array.isArray(reciboIds) ? reciboIds.map(String) : [];
    if (!ids.length) {
      return NextResponse.json({ error: 'reciboIds requerido.' }, { status: 400 });
    }

    const config = await getActiveConfig();
    if (!config) {
      return NextResponse.json({ error: 'Guarda primero el perfil fiscal.' }, { status: 400 });
    }

    const recibos = await prisma.reciboNomina.findMany({
      where: { id: { in: ids } },
      include: { empleado: true, percepciones: true, deducciones: true },
    });

    const items: ValidationItem[] = [];

    for (const recibo of recibos) {
      if (recibo.estado === 'TIMBRADO') {
        items.push({
          id: recibo.id,
          empleadoNombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`,
          estado: 'OK',
          errores: [],
        });
        continue;
      }

      const periodo = armarPeriodoNomina(
        recibo.fechaInicialPago.toISOString().slice(0, 10),
        recibo.fechaFinalPago.toISOString().slice(0, 10),
      );

      const xml = generarXMLNomina({
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

      const errores = validarXMLNomina(xml);
      await prisma.reciboNomina.update({
        where: { id: recibo.id },
        data: {
          estado: errores.length ? 'ERROR' : 'BORRADOR',
          mensajeError: errores.length ? errores.map((e) => `${e.codigo}: ${e.mensaje}`).join('\n') : null,
        },
      });

      items.push({
        id: recibo.id,
        empleadoNombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`,
        estado: errores.length ? 'ERROR' : 'OK',
        errores,
      });
    }

    const ok = items.filter((x) => x.estado === 'OK').length;
    const fail = items.length - ok;

    return NextResponse.json({
      ok,
      fail,
      details: items.flatMap((x) => x.errores.map((e) => ({ id: x.id, empleadoNombre: x.empleadoNombre, ...e }))),
      items,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al validar nómina.' }, { status: 500 });
  }
}
