import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { buildSftpConfig, testSftpConnection } from '@/lib/backups/sftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const config = buildSftpConfig(body);

  try {
    await testSftpConnection(config);

    return NextResponse.json({
      ok: true,
      message: 'Conexión SFTP OK.',
      remotePath: config.remotePath,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? `No se pudo conectar por SFTP: ${error.message}` : 'No se pudo conectar por SFTP.',
    }, { status: 400 });
  }
}
