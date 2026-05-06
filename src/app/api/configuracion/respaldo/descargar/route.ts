import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { createCompleteBackupArchive } from '@/lib/backups/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bufferToArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const archive = await createCompleteBackupArchive('manual');

  return new NextResponse(bufferToArrayBuffer(archive.content), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archive.filename}"`,
    },
  });
}
