import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { getOneDriveRefreshToken } from '@/lib/backups/tokens';
import { runBackup } from '@/lib/backups/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const refreshToken = await getOneDriveRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({
        error: 'Primero inicia sesión con OneDrive.',
        loginUrl: '/api/configuracion/respaldo/onedrive/login',
      }, { status: 401 });
    }

    return NextResponse.json(await runBackup('onedrive', 'manual'));
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo subir el respaldo a OneDrive.',
    }, { status: 400 });
  }
}
