export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTimbresReportScheduler } = await import('@/lib/timbres-scheduler');
    startTimbresReportScheduler();
  }
}
