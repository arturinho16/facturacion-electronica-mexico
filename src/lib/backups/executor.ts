import { mkdir, readFile, readdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { crearRespaldoSistema, nombreArchivoRespaldo } from '@/lib/respaldo';
import { crearRespaldoBDCompleta, nombreArchivoRespaldoBD } from '@/lib/backups/database-dump';
import { getGoogleDriveConfig, refreshGoogleDriveToken, uploadBackupToGoogleDrive } from '@/lib/backups/google-drive';
import { getOneDriveConfig, refreshOneDriveToken, uploadBackupToOneDrive } from '@/lib/backups/onedrive';
import { getGoogleDriveRefreshToken, getOneDriveRefreshToken, saveGoogleDriveRefreshToken, saveOneDriveRefreshToken } from '@/lib/backups/tokens';
import { SftpBackupConfig, uploadBackupToSftp } from '@/lib/backups/sftp';

export type BackupDestino = 'local' | 'onedrive' | 'drive' | 'sftp';

export type BackupExecutionResult = {
  ok: boolean;
  destino: BackupDestino;
  filename: string;
  createdAt: string;
  location?: string;
  message: string;
};

export type BackupHistoryEntry = {
  id: string;
  ok: boolean;
  destino: BackupDestino;
  filename?: string;
  location?: string;
  source: 'manual' | 'scheduled';
  startedAt: string;
  finishedAt: string;
  message: string;
};

const RESPALDOS_DIR = path.join(process.cwd(), 'respaldos-sistema');
const HISTORY_FILE = path.join(RESPALDOS_DIR, 'historial-respaldos.json');

function bufferToArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function createBackupPayload(source: 'manual' | 'scheduled') {
  const backup = await crearRespaldoSistema(source);
  const filename = nombreArchivoRespaldo();
  const content = JSON.stringify(backup, null, 2);
  return { backup, filename, content };
}

export async function createCompleteBackupArchive(source: 'manual' | 'scheduled' = 'manual') {
  const payload = await createBackupPayload(source);
  const sqlFilename = nombreArchivoRespaldoBD();
  const sql = await crearRespaldoBDCompleta();
  const zipFilename = payload.filename.replace('respaldo-sistema-', 'respaldo-completo-').replace(/\.json$/, '.zip');
  const zip = new JSZip();

  zip.file(payload.filename, payload.content);
  zip.file(sqlFilename, sql);

  return {
    filename: zipFilename,
    content: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    createdAt: payload.backup.metadata.createdAt,
    jsonFilename: payload.filename,
    sqlFilename,
  };
}

async function appendBackupHistory(entry: BackupHistoryEntry) {
  await mkdir(RESPALDOS_DIR, { recursive: true });

  let current: BackupHistoryEntry[] = [];
  try {
    const parsed = JSON.parse(await readFile(HISTORY_FILE, 'utf8')) as unknown;
    if (Array.isArray(parsed)) current = parsed as BackupHistoryEntry[];
  } catch {
    current = [];
  }

  await writeFile(HISTORY_FILE, JSON.stringify([entry, ...current].slice(0, 200), null, 2), 'utf8');
}

async function cleanupLocalRetention(retencion: number) {
  const max = Math.min(365, Math.max(1, Number(retencion || 15)));
  const files = await readdir(RESPALDOS_DIR).catch(() => []);
  const backupFiles = files
    .filter((file) => /^respaldo-(sistema|completo)-.*\.(json|zip)$/.test(file))
    .sort()
    .reverse();

  await Promise.all(
    backupFiles.slice(max).map((file) => unlink(path.join(RESPALDOS_DIR, file)).catch(() => undefined))
  );
}

export async function getBackupHistory() {
  try {
    const parsed = JSON.parse(await readFile(HISTORY_FILE, 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed as BackupHistoryEntry[] : [];
  } catch {
    return [];
  }
}

export async function runBackup(
  destino: BackupDestino,
  source: 'manual' | 'scheduled',
  options: { sftpConfig?: SftpBackupConfig; retencion?: number } = {},
): Promise<BackupExecutionResult> {
  const startedAt = new Date().toISOString();
  let filename = '';

  try {
    const payload = await createCompleteBackupArchive(source);
    filename = payload.filename;
    let location = '';

    if (destino === 'local') {
      await mkdir(RESPALDOS_DIR, { recursive: true });
      location = path.join(RESPALDOS_DIR, payload.filename);
      await writeFile(location, payload.content);
      await cleanupLocalRetention(options.retencion || 15);
    } else if (destino === 'onedrive') {
      const refreshToken = await getOneDriveRefreshToken();
      if (!refreshToken) throw new Error('Primero inicia sesión con OneDrive.');
      const config = await getOneDriveConfig();
      const token = await refreshOneDriveToken(config, refreshToken);
      if (token.refresh_token) await saveOneDriveRefreshToken(token.refresh_token);
      const uploaded = await uploadBackupToOneDrive(config, token.access_token!, payload.filename, bufferToArrayBuffer(payload.content), 'application/zip');
      location = uploaded.webUrl || uploaded.id || '';
    } else if (destino === 'drive') {
      const refreshToken = await getGoogleDriveRefreshToken();
      if (!refreshToken) throw new Error('Primero inicia sesión con Google Drive.');
      const config = getGoogleDriveConfig();
      const token = await refreshGoogleDriveToken(config, refreshToken);
      if (token.refresh_token) await saveGoogleDriveRefreshToken(token.refresh_token);
      const uploaded = await uploadBackupToGoogleDrive(config, token.access_token!, payload.filename, payload.content, 'application/zip');
      location = uploaded.webViewLink || uploaded.id || '';
    } else {
      if (!options.sftpConfig) throw new Error('Captura y guarda la conexión SFTP.');
      location = await uploadBackupToSftp(options.sftpConfig, payload.filename, payload.content);
    }

    const result = {
      ok: true,
      destino,
      filename: payload.filename,
      createdAt: payload.createdAt,
      location,
      message: destino === 'local'
        ? `Respaldo local creado: ${payload.filename}`
        : `Respaldo enviado a ${destino === 'drive' ? 'Google Drive' : destino === 'onedrive' ? 'OneDrive' : 'SFTP'}: ${payload.filename}`,
    };

    await appendBackupHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ok: true,
      destino,
      filename: payload.filename,
      location,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      message: result.message,
    });

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'No se pudo ejecutar el respaldo.';
    await appendBackupHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ok: false,
      destino,
      filename,
      source,
      startedAt,
      finishedAt: new Date().toISOString(),
      message,
    });
    throw error;
  }
}
