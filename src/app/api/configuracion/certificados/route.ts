import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { saveCertificate } from '@/lib/configuracion';

function arrayBufferToBase64(buffer: ArrayBuffer) {
    return Buffer.from(buffer).toString('base64');
}

export async function POST(req: NextRequest) {
    const guard = await requireModule('configuracion');
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const formData = await req.formData();
    const tipo = String(formData.get('tipo') || 'CSD'); // CSD | FIEL
    const password = String(formData.get('password') || '').trim();
    const cer = formData.get('cer') as File | null;
    const key = formData.get('key') as File | null;

    if (!cer || !key || !password) {
        return NextResponse.json({ error: 'Archivos .cer, .key y contraseña son obligatorios.' }, { status: 400 });
    }

    const [cerB64, keyB64] = await Promise.all([
        cer.arrayBuffer().then(arrayBufferToBase64),
        key.arrayBuffer().then(arrayBufferToBase64),
    ]);

    const inspection = await saveCertificate(tipo === 'FIEL' ? 'FIEL' : 'CSD', cerB64, keyB64, password);

    return NextResponse.json({
        ok: true,
        message: `Certificados ${tipo} guardados.`,
        certificado: inspection,
    });
}
