import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { runBackup } from '@/lib/backups/executor';
import { getGoogleDriveRefreshToken } from '@/lib/backups/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const refreshToken = await getGoogleDriveRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({
        error: 'Primero inicia sesión con Google Drive.',
        loginUrl: '/api/configuracion/respaldo/drive/login',
      }, { status: 401 });
    }

    return NextResponse.json(await runBackup('drive', 'manual'));
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo subir el respaldo a Google Drive.',
    }, { status: 400 });
  }
}
