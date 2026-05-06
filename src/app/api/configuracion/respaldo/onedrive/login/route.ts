import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { getOneDriveConfig, oneDriveAuthorizeUrl } from '@/lib/backups/onedrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const config = await getOneDriveConfig();
    const state = randomUUID();
    const redirectUri = new URL('/api/configuracion/respaldo/onedrive/callback', req.url).toString();
    const response = NextResponse.redirect(oneDriveAuthorizeUrl(config, redirectUri, state));
    response.cookies.set('onedrive_backup_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    return response;
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo iniciar sesión con OneDrive.',
    }, { status: 400 });
  }
}
