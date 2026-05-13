import { prisma } from '@/lib/prisma';

type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown[]>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<unknown>;
};

export type BackupModelName =
  | 'usuario'
  | 'user'
  | 'configuracionFiscal'
  | 'client'
  | 'product'
  | 'satClaveProdServ'
  | 'satClaveUnidad'
  | 'cotizacion'
  | 'factura'
  | 'conceptoCotizacion'
  | 'conceptoFactura'
  | 'perfilDescargaSat'
  | 'facturaRecibida'
  | 'solicitudSat'
  | 'expedienteFiscalDocumento'
  | 'expedienteFiscalSolicitud'
  | 'empleado'
  | 'reciboNomina'
  | 'nominaPercepcion'
  | 'nominaDeduccion'
  | 'nominaAprobacion'
  | 'registroTimbrado'
  | 'loginAttempt';

export type SystemBackup = {
  metadata: {
    app: string;
    version: 1;
    createdAt: string;
    source: 'manual' | 'scheduled';
    modelOrder: BackupModelName[];
  };
  data: Record<BackupModelName, unknown[]>;
};

export const BACKUP_MODEL_ORDER: BackupModelName[] = [
  'usuario',
  'user',
  'configuracionFiscal',
  'client',
  'product',
  'satClaveProdServ',
  'satClaveUnidad',
  'cotizacion',
  'factura',
  'conceptoCotizacion',
  'conceptoFactura',
  'perfilDescargaSat',
  'facturaRecibida',
  'solicitudSat',
  'expedienteFiscalDocumento',
  'expedienteFiscalSolicitud',
  'empleado',
  'reciboNomina',
  'nominaPercepcion',
  'nominaDeduccion',
  'nominaAprobacion',
  'registroTimbrado',
  'loginAttempt',
];

const getDelegate = (model: BackupModelName, client: unknown = prisma): PrismaDelegate => {
  const delegate = (client as Record<BackupModelName, PrismaDelegate>)[model];
  if (!delegate) throw new Error(`Modelo no disponible para respaldo: ${model}`);
  return delegate;
};

export async function crearRespaldoSistema(source: 'manual' | 'scheduled' = 'manual'): Promise<SystemBackup> {
  const data = {} as Record<BackupModelName, unknown[]>;

  for (const model of BACKUP_MODEL_ORDER) {
    data[model] = await getDelegate(model).findMany();
  }

  return {
    metadata: {
      app: 'facturacion-electronica-mexico',
      version: 1,
      createdAt: new Date().toISOString(),
      source,
      modelOrder: BACKUP_MODEL_ORDER,
    },
    data,
  };
}

export function validarRespaldoSistema(value: unknown): asserts value is SystemBackup {
  if (!value || typeof value !== 'object') throw new Error('El archivo no contiene un respaldo válido.');
  const backup = value as Partial<SystemBackup>;
  if (!backup.metadata || backup.metadata.version !== 1) throw new Error('Versión de respaldo no soportada.');
  if (!backup.data || typeof backup.data !== 'object') throw new Error('El respaldo no contiene datos.');

  for (const model of BACKUP_MODEL_ORDER) {
    if (['perfilDescargaSat', 'expedienteFiscalDocumento', 'expedienteFiscalSolicitud'].includes(model) && (backup.data as Record<string, unknown>)[model] === undefined) {
      continue;
    }

    if (!Array.isArray((backup.data as Record<string, unknown>)[model])) {
      throw new Error(`El respaldo no contiene la tabla requerida: ${model}`);
    }
  }
}

export async function restaurarRespaldoSistema(backup: SystemBackup) {
  validarRespaldoSistema(backup);

  await prisma.$transaction(async (tx) => {
    for (const model of [...BACKUP_MODEL_ORDER].reverse()) {
      await getDelegate(model, tx).deleteMany();
    }

    for (const model of BACKUP_MODEL_ORDER) {
      const rows = backup.data[model] || [];
      if (rows.length) {
        await getDelegate(model, tx).createMany({ data: rows });
      }
    }
  }, { timeout: 120_000 });

  return {
    restoredAt: new Date().toISOString(),
    tables: BACKUP_MODEL_ORDER.map((model) => ({ model, count: backup.data[model].length })),
  };
}

export function nombreArchivoRespaldo(date = new Date()) {
  return `respaldo-sistema-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}
