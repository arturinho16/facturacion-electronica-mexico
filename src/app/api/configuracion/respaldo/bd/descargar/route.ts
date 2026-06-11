import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session-server';
import { createCompleteBackupArchive } from '@/lib/backups/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bufferToArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    const archive = await createCompleteBackupArchive('manual');

    return new NextResponse(bufferToArrayBuffer(archive.content), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archive.filename}"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo crear el respaldo completo de BD.',
    }, { status: 500 });
  }
}
