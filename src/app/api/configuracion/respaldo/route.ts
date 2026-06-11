import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { BackupDestino, runBackup } from '@/lib/backups/executor';

const DESTINOS_VALIDOS: BackupDestino[] = ['local', 'onedrive', 'drive', 'sftp'];

export async function GET(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const destino = req.nextUrl.searchParams.get('destino') || 'local';
  if (!DESTINOS_VALIDOS.includes(destino as BackupDestino)) {
    return NextResponse.json({ error: 'Destino de respaldo no soportado.' }, { status: 400 });
  }

  if (destino !== 'local') {
    return NextResponse.json({
      error: 'Usa los endpoints específicos de OneDrive, Google Drive o SFTP para enviar credenciales y autenticación.',
    }, { status: 400 });
  }

  try {
    return NextResponse.json(await runBackup('local', 'manual'));
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo crear el respaldo local.',
    }, { status: 400 });
  }
}
