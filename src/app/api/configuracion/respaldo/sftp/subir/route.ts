import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { runBackup } from '@/lib/backups/executor';
import { buildSftpConfig } from '@/lib/backups/sftp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const config = buildSftpConfig(body);

  try {
    return NextResponse.json(await runBackup('sftp', 'manual', { sftpConfig: config }));
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo subir el respaldo por SFTP.',
    }, { status: 400 });
  }
}
