import { prisma } from '@/lib/prisma';
import { GET as verificarExpedienteFiscal } from '@/app/api/expediente-fiscal/verificar/route';
import { ensureExpedienteFiscalSchema } from '@/lib/expediente-fiscal/schema';

const CRON_INTERVAL_MS = 5 * 60 * 1000;

const globalForExpedienteCron = globalThis as typeof globalThis & {
  __EXPEDIENTE_FISCAL_CRON__?: {
    intervalId: ReturnType<typeof setInterval> | null;
    running: boolean;
    startedAt: number;
    lastRunAt?: number;
  };
};

function stopCronInterval() {
  const state = globalForExpedienteCron.__EXPEDIENTE_FISCAL_CRON__;

  if (state?.intervalId) {
    clearInterval(state.intervalId);
  }

  globalForExpedienteCron.__EXPEDIENTE_FISCAL_CRON__ = undefined;
}

async function hasAnyCronWork() {
  await ensureExpedienteFiscalSchema();

  const total = await prisma.expedienteFiscalSolicitud.count({
    where: { estado: { in: ['PENDIENTE', 'EN_PROCESO'] } },
  });

  return total > 0;
}

async function runVerificacionBackground() {
  const state = globalForExpedienteCron.__EXPEDIENTE_FISCAL_CRON__;
  if (!state || state.running) return;

  state.running = true;
  state.lastRunAt = Date.now();

  try {
    const response = await verificarExpedienteFiscal();
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Expediente fiscal cron] Error:', data);
    } else if (data?.mensaje) {
      console.log('[Expediente fiscal cron]', data.mensaje);
    }

    if (!(await hasAnyCronWork())) {
      stopCronInterval();
    }
  } catch (error) {
    console.error('[Expediente fiscal cron] Error ejecutando verificacion:', error);
  } finally {
    state.running = false;
  }
}

export function startExpedienteFiscalCron() {
  const current = globalForExpedienteCron.__EXPEDIENTE_FISCAL_CRON__;

  if (current?.intervalId) {
    return current;
  }

  const state = {
    intervalId: null as ReturnType<typeof setInterval> | null,
    running: false,
    startedAt: Date.now(),
  };

  globalForExpedienteCron.__EXPEDIENTE_FISCAL_CRON__ = state;

  void runVerificacionBackground();

  state.intervalId = setInterval(() => {
    void runVerificacionBackground();
  }, CRON_INTERVAL_MS);

  return state;
}

export function stopExpedienteFiscalCron() {
  stopCronInterval();
}
