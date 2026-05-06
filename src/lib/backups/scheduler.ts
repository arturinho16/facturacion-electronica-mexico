import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { BackupDestino, runBackup } from '@/lib/backups/executor';
import { buildSftpConfig } from '@/lib/backups/sftp';

type BackupScheduleFile = {
  activo?: boolean;
  frecuencia?: 'diario' | 'semanal' | 'mensual';
  hora?: string;
  destino?: BackupDestino;
  retencion?: number;
  sftpConfig?: Record<string, unknown>;
  lastRunAt?: string;
  lastRunKey?: string;
  lastRunStatus?: 'ok' | 'error';
  lastRunMessage?: string;
};

const RESPALDOS_DIR = path.join(process.cwd(), 'respaldos-sistema');
const PROGRAMACION_FILE = path.join(RESPALDOS_DIR, 'programacion-respaldo.json');
const CHECK_INTERVAL_MS = 60 * 1000;

const globalForBackupScheduler = globalThis as typeof globalThis & {
  __BACKUP_SCHEDULER__?: {
    intervalId: ReturnType<typeof setInterval> | null;
    running: boolean;
    startedAt: number;
  };
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function weekKey(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return `${date.getFullYear()}-W${pad(Math.floor(diffDays / 7) + 1)}`;
}

function runKey(schedule: BackupScheduleFile, now: Date) {
  if (schedule.frecuencia === 'mensual') return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  if (schedule.frecuencia === 'semanal') return weekKey(now);
  return localDateKey(now);
}

function shouldRun(schedule: BackupScheduleFile, now: Date) {
  if (!schedule.activo) return false;
  const hora = /^\d{2}:\d{2}$/.test(String(schedule.hora || '')) ? String(schedule.hora) : '23:00';
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (nowTime < hora) return false;
  return schedule.lastRunKey !== runKey(schedule, now);
}

async function readSchedule() {
  const raw = await readFile(PROGRAMACION_FILE, 'utf8');
  return JSON.parse(raw) as BackupScheduleFile;
}

async function writeSchedule(schedule: BackupScheduleFile) {
  await writeFile(PROGRAMACION_FILE, JSON.stringify(schedule, null, 2), 'utf8');
}

export async function runScheduledBackupOnce() {
  const state = globalForBackupScheduler.__BACKUP_SCHEDULER__;
  if (state?.running) return;

  if (state) state.running = true;

  try {
    const schedule = await readSchedule();
    const now = new Date();
    if (!shouldRun(schedule, now)) return;

    const destino = ['local', 'onedrive', 'drive', 'sftp'].includes(String(schedule.destino))
      ? schedule.destino as BackupDestino
      : 'local';

    try {
      const result = await runBackup(destino, 'scheduled', {
        retencion: schedule.retencion || 15,
        sftpConfig: destino === 'sftp' ? buildSftpConfig(schedule.sftpConfig || {}) : undefined,
      });

      await writeSchedule({
        ...schedule,
        lastRunAt: new Date().toISOString(),
        lastRunKey: runKey(schedule, now),
        lastRunStatus: 'ok',
        lastRunMessage: result.message,
      });
    } catch (error: unknown) {
      await writeSchedule({
        ...schedule,
        lastRunAt: new Date().toISOString(),
        lastRunKey: runKey(schedule, now),
        lastRunStatus: 'error',
        lastRunMessage: error instanceof Error ? error.message : 'No se pudo ejecutar el respaldo programado.',
      });
    }
  } catch {
    return;
  } finally {
    if (state) state.running = false;
  }
}

export function startBackupScheduler() {
  const current = globalForBackupScheduler.__BACKUP_SCHEDULER__;
  if (current?.intervalId) return current;

  const state = {
    intervalId: null as ReturnType<typeof setInterval> | null,
    running: false,
    startedAt: Date.now(),
  };

  globalForBackupScheduler.__BACKUP_SCHEDULER__ = state;
  void runScheduledBackupOnce();
  state.intervalId = setInterval(() => {
    void runScheduledBackupOnce();
  }, CHECK_INTERVAL_MS);

  return state;
}
