import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireModule } from '@/lib/auth/session-server';
import { startBackupScheduler } from '@/lib/backups/scheduler';

const RESPALDOS_DIR = path.join(process.cwd(), 'respaldos-sistema');
const PROGRAMACION_FILE = path.join(RESPALDOS_DIR, 'programacion-respaldo.json');

const DEFAULT_SCHEDULE = {
  activo: false,
  frecuencia: 'diario',
  hora: '23:00',
  destino: 'local',
  retencion: 15,
  lastRunAt: null,
  lastRunStatus: null,
  lastRunMessage: null,
};

function sanitizeSftpConfig(value: unknown) {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    host: String(raw.host || '').trim(),
    port: Math.min(65535, Math.max(1, Number(raw.port || 22))),
    username: String(raw.username || '').trim(),
    password: String(raw.password || ''),
    remotePath: String(raw.remotePath || '/').trim() || '/',
  };
}

export async function GET() {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  try {
    startBackupScheduler();
    const raw = await readFile(PROGRAMACION_FILE, 'utf8');
    return NextResponse.json({ ok: true, schedule: { ...DEFAULT_SCHEDULE, ...JSON.parse(raw) } });
  } catch {
    return NextResponse.json({ ok: true, schedule: DEFAULT_SCHEDULE });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireModule('configuracion');
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

  const body = await req.json();
  const schedule = {
    activo: Boolean(body.activo),
    frecuencia: ['diario', 'semanal', 'mensual'].includes(body.frecuencia) ? body.frecuencia : 'diario',
    hora: /^\d{2}:\d{2}$/.test(String(body.hora || '')) ? String(body.hora) : '23:00',
    destino: ['local', 'onedrive', 'drive', 'sftp'].includes(body.destino) ? body.destino : 'local',
    retencion: Math.min(365, Math.max(1, Number(body.retencion || 15))),
    sftpConfig: sanitizeSftpConfig(body.sftpConfig),
    updatedAt: new Date().toISOString(),
  };

  await mkdir(RESPALDOS_DIR, { recursive: true });
  await writeFile(PROGRAMACION_FILE, JSON.stringify(schedule, null, 2), 'utf8');
  startBackupScheduler();

  return NextResponse.json({ ok: true, schedule });
}
