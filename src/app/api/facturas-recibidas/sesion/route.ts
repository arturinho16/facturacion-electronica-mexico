import { NextResponse } from 'next/server';
import { DescargaMasivaSAT } from '@/lib/sat/descarga-masiva';
import { startFacturasRecibidasCron, stopFacturasRecibidasCronIfIdle } from '@/lib/sat/facturas-recibidas-cron';
import { clearSatSession, getSatSession, setSatSession } from '@/lib/sat/session-store';
import { getActiveConfig, getFielCredentialsAsBinary } from '@/lib/configuracion';
import { ensurePerfilDescargaSat, normalizarPerfilClave, updatePerfilSatIdentity } from '@/lib/sat/perfiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const perfilClave = normalizarPerfilClave(searchParams.get('perfil'));
    const perfil = await ensurePerfilDescargaSat(perfilClave);
    const session = getSatSession(perfilClave);
    const config = perfilClave === 'principal' ? await getActiveConfig() : null;

    return NextResponse.json({
        activa: Boolean(session),
        rfc: session?.rfc || '',
        rfcNombre: session?.rfcNombre || perfil.rfcNombre || '',
        perfil: {
            clave: perfil.clave,
            nombre: perfil.nombre,
            rfc: perfil.rfc,
            rfcNombre: perfil.rfcNombre,
        },
        configuracion: config
            ? {
                rfc: config.rfc || '',
                nombre: config.razonSocial || config.nombreComercial || '',
                fielCargada: Boolean(config.fielCertificadoBase64 && config.fielLlaveBase64 && config.fielPasswordEncrypted),
            }
            : null,
    });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const perfilClave = normalizarPerfilClave(formData.get('perfil'));
        const usarConfiguracion = String(formData.get('usarConfiguracion') || '') === 'true';
        const rfc = String(formData.get('rfc') || '').trim().toUpperCase();
        const rfcNombre = String(formData.get('rfcNombre') || '').trim();
        const password = String(formData.get('password') || '').trim();
        const cer = formData.get('cer');
        const key = formData.get('key');

        if (perfilClave === 'principal' && usarConfiguracion) {
            const config = await getActiveConfig();
            const fiel = await getFielCredentialsAsBinary();

            if (!config || !fiel) {
                return NextResponse.json(
                    { error: 'No hay e.firma FIEL configurada. Carga .cer, .key y contraseña en Configuración o usa otra e.firma.' },
                    { status: 400 }
                );
            }

            setSatSession({
                perfilClave,
                rfc: config.rfc || fiel.rfc,
                rfcNombre: config.razonSocial || config.nombreComercial || '',
                password: fiel.password,
                cerBase64: Buffer.from(fiel.cerString, 'binary').toString('base64'),
                keyBase64: Buffer.from(fiel.keyString, 'binary').toString('base64'),
            });

            await updatePerfilSatIdentity(perfilClave, {
                rfc: config.rfc || fiel.rfc,
                rfcNombre: config.razonSocial || config.nombreComercial || '',
            });

            startFacturasRecibidasCron();

            return NextResponse.json({
                ok: true,
                activa: true,
                rfc: config.rfc || fiel.rfc,
                rfcNombre: config.razonSocial || config.nombreComercial || '',
                mensaje: 'Sesión SAT iniciada con la e.firma configurada.',
            });
        }

        if (!rfc || !password || !cer || !key) {
            return NextResponse.json(
                { error: 'Faltan RFC, contraseña, archivo .cer o archivo .key.' },
                { status: 400 }
            );
        }

        if (!(cer instanceof File) || !(key instanceof File)) {
            return NextResponse.json(
                { error: 'Los archivos .cer y .key no fueron recibidos correctamente.' },
                { status: 400 }
            );
        }

        const cerBuffer = Buffer.from(await cer.arrayBuffer());
        const keyBuffer = Buffer.from(await key.arrayBuffer());

        // Validación real de la e.firma
        new DescargaMasivaSAT(
            cerBuffer.toString('binary'),
            keyBuffer.toString('binary'),
            password
        );

        setSatSession({
            perfilClave,
            rfc,
            rfcNombre,
            password,
            cerBase64: cerBuffer.toString('base64'),
            keyBase64: keyBuffer.toString('base64'),
        });

        await updatePerfilSatIdentity(perfilClave, { rfc, rfcNombre });

        startFacturasRecibidasCron();

        return NextResponse.json({
            ok: true,
            activa: true,
            rfc,
            rfcNombre,
            mensaje: 'Sesión SAT iniciada correctamente.',
        });
    } catch (error: unknown) {
        console.error('Error al iniciar sesión SAT:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'No fue posible iniciar la sesión SAT.' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const perfilClave = normalizarPerfilClave(searchParams.get('perfil'));

    clearSatSession(perfilClave);
    await stopFacturasRecibidasCronIfIdle();

    return NextResponse.json({
        ok: true,
        mensaje: 'Sesión SAT cerrada correctamente.',
    });
}
