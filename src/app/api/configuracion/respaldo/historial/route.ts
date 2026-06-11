import { NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { getBackupHistory } from '@/lib/backups/executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  return NextResponse.json({ ok: true, history: await getBackupHistory() });
}
