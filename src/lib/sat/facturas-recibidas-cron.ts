import { prisma } from '@/lib/prisma';
import { GET as verificarFacturasRecibidas } from '@/app/api/facturas-recibidas/verificar/route';

const CRON_INTERVAL_MS = 5 * 60 * 1000;

const globalForFacturasRecibidasCron = globalThis as typeof globalThis & {
    __FACTURAS_RECIBIDAS_CRON__?: {
        intervalId: ReturnType<typeof setInterval> | null;
        running: boolean;
        startedAt: number;
        lastRunAt?: number;
    };
};

async function hasSolicitudesPendientes() {
    const total = await prisma.solicitudSat.count({
        where: {
            estado: {
                in: ['PENDIENTE', 'EN_PROCESO', 'REINTENTO_MANANA'],
            },
        },
    });

    return total > 0;
}

async function runVerificacionBackground() {
    const state = globalForFacturasRecibidasCron.__FACTURAS_RECIBIDAS_CRON__;
    if (!state || state.running) return;

    state.running = true;
    state.lastRunAt = Date.now();

    try {
        if (!(await hasSolicitudesPendientes())) return;

        const response = await verificarFacturasRecibidas();
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            console.error('[Facturas recibidas cron] Error:', data);
        } else if (data?.mensaje) {
            console.log('[Facturas recibidas cron]', data.mensaje);
        }
    } catch (error) {
        console.error('[Facturas recibidas cron] Error ejecutando verificacion:', error);
    } finally {
        state.running = false;
    }
}

export function startFacturasRecibidasCron() {
    const current = globalForFacturasRecibidasCron.__FACTURAS_RECIBIDAS_CRON__;

    if (current?.intervalId) {
        return current;
    }

    const state = {
        intervalId: null as ReturnType<typeof setInterval> | null,
        running: false,
        startedAt: Date.now(),
    };

    globalForFacturasRecibidasCron.__FACTURAS_RECIBIDAS_CRON__ = state;

    void runVerificacionBackground();

    state.intervalId = setInterval(() => {
        void runVerificacionBackground();
    }, CRON_INTERVAL_MS);

    return state;
}

export function stopFacturasRecibidasCron() {
    const state = globalForFacturasRecibidasCron.__FACTURAS_RECIBIDAS_CRON__;

    if (state?.intervalId) {
        clearInterval(state.intervalId);
    }

    globalForFacturasRecibidasCron.__FACTURAS_RECIBIDAS_CRON__ = undefined;
}
