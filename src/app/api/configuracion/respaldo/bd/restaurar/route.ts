import JSZip from 'jszip';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session-server';
import { restaurarRespaldoBDCompleta } from '@/lib/backups/database-dump';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function readSqlFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buffer);
    const sqlFile = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.sql'));
    if (!sqlFile) throw new Error('El ZIP no contiene un archivo .sql.');
    return await sqlFile.async('string');
  }

  return buffer.toString('utf8');
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const form = await req.formData();
  const confirmacion = String(form.get('confirmacion') || '').trim().toUpperCase();
  const file = form.get('file');

  if (confirmacion !== 'RESTAURAR_BD') {
    return NextResponse.json({ error: 'Escribe RESTAURAR_BD para confirmar.' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Carga un archivo .sql o .zip de respaldo completo.' }, { status: 400 });
  }

  try {
    const sql = await readSqlFile(file);
    await restaurarRespaldoBDCompleta(sql);
    return NextResponse.json({ ok: true, message: 'Base de datos completa restaurada.' });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo restaurar la base de datos completa.',
    }, { status: 400 });
  }
}
