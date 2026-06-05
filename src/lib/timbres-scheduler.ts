import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { enviarReporteTimbresSemanal, getSemanaAnterior } from '@/lib/timbres';

type TimbresScheduleFile = {
  activo?: boolean;
  diaSemana?: number;
  hora?: string;
  lastRunKey?: string;
  lastRunAt?: string;
  lastRunStatus?: 'ok' | 'error';
  lastRunMessage?: string;
};

const RESPALDOS_DIR = path.join(process.cwd(), 'respaldos-sistema');
const PROGRAMACION_FILE = path.join(RESPALDOS_DIR, 'programacion-reporte-timbres.json');
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const globalForTimbresScheduler = globalThis as typeof globalThis & {
  __TIMBRES_REPORT_SCHEDULER__?: {
    intervalId: ReturnType<typeof setInterval> | null;
    running: boolean;
    startedAt: number;
  };
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function weekKey(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return `${date.getFullYear()}-W${pad(Math.floor(diffDays / 7) + 1)}`;
}

async function readSchedule(): Promise<TimbresScheduleFile> {
  try {
    const parsed = JSON.parse(await readFile(PROGRAMACION_FILE, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as TimbresScheduleFile : {};
  } catch {
    return { activo: true, diaSemana: 1, hora: '08:00' };
  }
}

async function writeSchedule(schedule: TimbresScheduleFile) {
  await mkdir(RESPALDOS_DIR, { recursive: true });
  await writeFile(PROGRAMACION_FILE, JSON.stringify(schedule, null, 2), 'utf8');
}

function shouldRun(schedule: TimbresScheduleFile, now: Date) {
  if (schedule.activo === false) return false;
  const diaSemana = typeof schedule.diaSemana === 'number' ? schedule.diaSemana : 1;
  if (now.getDay() !== diaSemana) return false;
  const hora = /^\d{2}:\d{2}$/.test(String(schedule.hora || '')) ? String(schedule.hora) : '08:00';
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (nowTime < hora) return false;
  return schedule.lastRunKey !== weekKey(now);
}

export async function runScheduledTimbresReportOnce() {
  const state = globalForTimbresScheduler.__TIMBRES_REPORT_SCHEDULER__;
  if (state?.running) return;
  if (state) state.running = true;

  try {
    const schedule = await readSchedule();
    const now = new Date();
    if (!shouldRun(schedule, now)) return;

    try {
      const { desde, hasta } = getSemanaAnterior(now);
      const result = await enviarReporteTimbresSemanal(desde, hasta);
      await writeSchedule({
        ...schedule,
        activo: schedule.activo !== false,
        diaSemana: typeof schedule.diaSemana === 'number' ? schedule.diaSemana : 1,
        hora: schedule.hora || '08:00',
        lastRunAt: new Date().toISOString(),
        lastRunKey: weekKey(now),
        lastRunStatus: 'ok',
        lastRunMessage: `Enviado a ${result.destino}. Timbres: ${result.total}`,
      });
    } catch (error: unknown) {
      await writeSchedule({
        ...schedule,
        lastRunAt: new Date().toISOString(),
        lastRunKey: weekKey(now),
        lastRunStatus: 'error',
        lastRunMessage: error instanceof Error ? error.message : 'No se pudo enviar el reporte semanal.',
      });
    }
  } finally {
    if (state) state.running = false;
  }
}

export function startTimbresReportScheduler() {
  const current = globalForTimbresScheduler.__TIMBRES_REPORT_SCHEDULER__;
  if (current?.intervalId) return current;

  const state = {
    intervalId: null as ReturnType<typeof setInterval> | null,
    running: false,
    startedAt: Date.now(),
  };
  globalForTimbresScheduler.__TIMBRES_REPORT_SCHEDULER__ = state;
  void runScheduledTimbresReportOnce();
  state.intervalId = setInterval(() => {
    void runScheduledTimbresReportOnce();
  }, CHECK_INTERVAL_MS);
  return state;
}
