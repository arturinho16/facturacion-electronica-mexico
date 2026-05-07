import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generarXMLNomina } from '@/app/nomina/facturacion-masiva/utils/generarXMLNomina';
import { getNoCertificado, getCertificadoBase64, keyToPem } from '@/lib/sat/firmar';
import * as soap from 'soap';
import { getActiveConfig, getCsdCredentials, registrarTimbreUsado } from '@/lib/configuracion';
import { generarCadenaOriginal, inyectarCertificado, inyectarSello, sellarCadena } from '@/lib/nomina/sellado';
import { armarPeriodoNomina, obtenerDatosEmpleadoNomina, obtenerDatosEmisorNomina } from '@/lib/nomina/armado';

const WSDL_DEMO = 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
const WSDL_PROD = 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';

export async function POST(req: Request) {
    try {
        const { recibosIds } = await req.json();

        // 1. Obtener recibos con TODO su detalle (Relaciones de Prisma)
        const recibos = await prisma.reciboNomina.findMany({
            where: { id: { in: recibosIds }, estado: 'BORRADOR' },
            include: {
                empleado: true,
                percepciones: true,
                deducciones: true
            }
        });

        if (recibos.length === 0) {
            return NextResponse.json({ message: 'No hay recibos válidos en estado BORRADOR.' }, { status: 400 });
        }

        // 2. Extraer CSD de la configuración guardada
        const [config, csd] = await Promise.all([getActiveConfig(), getCsdCredentials()]);

        if (!config) {
            return NextResponse.json({ error: 'Guarda primero el perfil fiscal.' }, { status: 400 });
        }

        if (!csd?.certificadoBase64 || !csd.llaveBase64 || !csd.password) {
            return NextResponse.json({ error: 'Carga y activa los sellos CSD antes de timbrar nómina.' }, { status: 400 });
        }
        if (!csd.pacUsuario || !csd.pacPassword) {
            return NextResponse.json({ error: 'Configura usuario y contraseña del PAC Finkok antes de timbrar nómina.' }, { status: 400 });
        }

        const cerB64 = csd.certificadoBase64;
        const keyB64 = csd.llaveBase64;
        const passwordCSD = csd.password;

        const noCertificado = getNoCertificado(cerB64);
        const certificadoB64 = getCertificadoBase64(cerB64);
        const keyPem = keyToPem(keyB64, passwordCSD);

        // 3. Configuración de Finkok
        const usuarioFinkok = csd.pacUsuario;
        const passwordFinkok = csd.pacPassword;
        const ambiente = csd.pacAmbiente || 'demo';
        const wsdl = csd.pacStampUrl || (ambiente === 'demo' ? WSDL_DEMO : WSDL_PROD);

        // 🔥 OPTIMIZACIÓN: Creamos el cliente SOAP una sola vez para toda la tanda
        const client = await soap.createClientAsync(wsdl);

        const resultados = [];

        // 4. Iterar sobre cada recibo para firmar y timbrar
        for (const recibo of recibos) {
            try {
                const periodo = armarPeriodoNomina(
                    recibo.fechaInicialPago.toISOString().slice(0, 10),
                    recibo.fechaFinalPago.toISOString().slice(0, 10),
                );

                // A) Generar el XML crudo con el Placeholder
                const xmlUnsigned = generarXMLNomina({
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

                // B) Generar Cadena Original y Sello Criptográfico
                const xmlConCertificado = inyectarCertificado(xmlUnsigned, {
                    certificado: certificadoB64,
                    noCertificado,
                });
                const cadenaOriginal = await generarCadenaOriginal(xmlConCertificado);
                const sello = sellarCadena(cadenaOriginal, keyPem);

                // C) Inyectar el sello real reemplazando el placeholder
                const xmlFirmado = inyectarSello(xmlConCertificado, { sello });

                // 👇 RADIOGRAFÍA COMPLETA EN CONSOLA 👇
                console.log(`\n========== EMPLEADO: ${recibo.empleado.nombre} ==========`);
                console.log(`\n[1] CADENA ORIGINAL:\n${cadenaOriginal}`);
                console.log(`\n[2] SELLO GENERADO:\n${sello}`);
                console.log(`\n[3] XML FINAL A FINKOK:\n${xmlFirmado}`);
                console.log(`=====================================================\n`);

                // D) Petición a Finkok
                const xmlBase64 = Buffer.from(xmlFirmado, 'utf-8').toString('base64');
                const [result] = await client.stampAsync({
                    xml: xmlBase64,
                    username: usuarioFinkok,
                    password: passwordFinkok
                });

                const stampResult = result?.stampResult;

                // E) Manejo estricto de errores del SAT / Finkok
                if (!stampResult || !stampResult.UUID) {
                    const incidencias = stampResult?.Incidencias?.Incidencia;
                    const incidencia = Array.isArray(incidencias) ? incidencias[0] : incidencias;
                    throw new Error(`Rechazo Finkok/SAT: ${incidencia?.MensajeIncidencia || stampResult?.CodEstatus || 'Error desconocido'}`);
                }

                // F) Limpieza del XML de retorno (Finkok a veces devuelve Base64 o caracteres invisibles BOM)
                let xmlFinal = stampResult.xml;
                if (Buffer.isBuffer(xmlFinal)) xmlFinal = xmlFinal.toString('utf-8');
                else if (typeof xmlFinal !== 'string') xmlFinal = String(xmlFinal);

                if (!xmlFinal.includes('cfdi:Comprobante')) {
                    const decodificado = Buffer.from(xmlFinal, 'base64').toString('utf-8');
                    if (decodificado.includes('cfdi:Comprobante')) xmlFinal = decodificado;
                }
                xmlFinal = xmlFinal.replace(/^\uFEFF/, '').trim();

                // G) Persistencia en Base de Datos (ÉXITO)
                await prisma.$transaction(async (tx) => {
                    await tx.reciboNomina.update({
                        where: { id: recibo.id },
                        data: {
                            estado: 'TIMBRADO',
                            uuid: stampResult.UUID,
                            xmlTimbrado: xmlFinal,
                            mensajeError: null // Limpiamos errores previos si los hubo
                        }
                    });
                    await registrarTimbreUsado(tx);
                });

                resultados.push({
                    empleado: recibo.empleado.numEmpleado,
                    nombre: `${recibo.empleado.nombre} ${recibo.empleado.apellidoPaterno}`,
                    status: 'Exito',
                    uuid: stampResult.UUID
                });

            } catch (error: unknown) {
                const mensajeError = error instanceof Error ? error.message : 'Error al timbrar el recibo.';
                // H) Persistencia de Errores (Evita que un recibo malo tire toda la nómina)
                await prisma.reciboNomina.update({
                    where: { id: recibo.id },
                    data: {
                        estado: 'ERROR',
                        mensajeError
                    }
                });

                resultados.push({
                    empleado: recibo.empleado.numEmpleado,
                    nombre: recibo.empleado.nombre,
                    status: 'Error',
                    mensaje: mensajeError
                });
            }
        }

        return NextResponse.json({ message: 'Proceso de timbrado finalizado', resultados });

    } catch (error: unknown) {
        console.error("Error crítico en controlador de timbrado masivo:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error crítico en timbrado masivo.' }, { status: 500 });
    }
}
