import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { restaurarRespaldoSistema, validarRespaldoSistema } from '@/lib/respaldo';

async function readJsonBackup(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buffer);
    const jsonFile = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'));
    if (!jsonFile) throw new Error('El ZIP no contiene un archivo .json.');
    return await jsonFile.async('string');
  }

  return buffer.toString('utf8');
}

export async function POST(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const form = await req.formData();
  const confirmacion = String(form.get('confirmacion') || '').trim().toUpperCase();
  const file = form.get('file');

  if (confirmacion !== 'RESTAURAR') {
    return NextResponse.json({ error: 'Escribe RESTAURAR para confirmar la recuperación.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Carga un archivo JSON de respaldo.' }, { status: 400 });
  }

  try {
    const backup = JSON.parse(await readJsonBackup(file)) as unknown;
    validarRespaldoSistema(backup);
    const result = await restaurarRespaldoSistema(backup);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.',
    }, { status: 400 });
  }
}
