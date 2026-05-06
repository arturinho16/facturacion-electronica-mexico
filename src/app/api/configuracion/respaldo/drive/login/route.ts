import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { getGoogleDriveConfig, googleDriveAuthorizeUrl } from '@/lib/backups/google-drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const config = getGoogleDriveConfig();
    const state = randomUUID();
    const response = NextResponse.redirect(googleDriveAuthorizeUrl(config, state));
    response.cookies.set('google_drive_backup_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo iniciar sesión con Google Drive.',
    }, { status: 400 });
  }
}
