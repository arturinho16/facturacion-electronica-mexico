import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { exchangeGoogleDriveCode, getGoogleDriveConfig } from '@/lib/backups/google-drive';
import { runBackup } from '@/lib/backups/executor';
import { saveGoogleDriveRefreshToken } from '@/lib/backups/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function finish(req: NextRequest, status: 'ok' | 'error', message: string) {
  const url = new URL('/configuracion', req.url);
  url.searchParams.set('respaldo', status);
  url.searchParams.set('mensaje', message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const code = req.nextUrl.searchParams.get('code') || '';
  const state = req.nextUrl.searchParams.get('state') || '';
  const expectedState = req.cookies.get('google_drive_backup_state')?.value || '';
  const error = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error') || '';

  if (error) return finish(req, 'error', error);
  if (!code || !state || state !== expectedState) return finish(req, 'error', 'La autenticación con Google Drive no fue válida.');

  try {
    const config = getGoogleDriveConfig();
    const token = await exchangeGoogleDriveCode(config, code);

    if (token.refresh_token) {
      await saveGoogleDriveRefreshToken(token.refresh_token);
    }

    const result = await runBackup('drive', 'manual');
    const response = finish(req, 'ok', result.message);
    response.cookies.delete('google_drive_backup_state');
    return response;
  } catch (uploadError: unknown) {
    return finish(req, 'error', uploadError instanceof Error ? uploadError.message : 'No se pudo subir el respaldo a Google Drive.');
  }
}
