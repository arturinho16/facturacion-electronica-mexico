import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

const RESPALDOS_DIR = path.join(process.cwd(), 'respaldos-sistema');
const ONEDRIVE_TOKEN_FILE = path.join(RESPALDOS_DIR, 'onedrive-token.json');
const GOOGLE_DRIVE_TOKEN_FILE = path.join(RESPALDOS_DIR, 'google-drive-token.json');

type StoredRefreshToken = {
  refreshToken: string;
  savedAt: string;
};

async function saveRefreshToken(filepath: string, refreshToken: string) {
  await mkdir(RESPALDOS_DIR, { recursive: true });
  await writeFile(filepath, JSON.stringify({
    refreshToken,
    savedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
}

async function getRefreshToken(filepath: string) {
  try {
    const token = JSON.parse(await readFile(filepath, 'utf8')) as Partial<StoredRefreshToken>;
    return typeof token.refreshToken === 'string' ? token.refreshToken : '';
  } catch {
    return '';
  }
}

export async function saveOneDriveRefreshToken(refreshToken: string) {
  await saveRefreshToken(ONEDRIVE_TOKEN_FILE, refreshToken);
}

export async function getOneDriveRefreshToken() {
  return await getRefreshToken(ONEDRIVE_TOKEN_FILE);
}

export async function saveGoogleDriveRefreshToken(refreshToken: string) {
  await saveRefreshToken(GOOGLE_DRIVE_TOKEN_FILE, refreshToken);
}

export async function getGoogleDriveRefreshToken() {
  return await getRefreshToken(GOOGLE_DRIVE_TOKEN_FILE);
}
