import { readFile } from 'fs/promises';
import path from 'path';

export type OneDriveConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  folderPath: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GraphDriveItem = {
  id?: string;
  name?: string;
  webUrl?: string;
  error?: {
    message?: string;
  };
};

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : '';
}

async function readEnvFallback() {
  try {
    return await readFile(path.join(process.cwd(), '.env'), 'utf8');
  } catch {
    return '';
  }
}

function nextValueAfterLabel(raw: string, label: string) {
  const lines = raw.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().toLowerCase() === label.toLowerCase());
  if (index < 0) return '';

  for (const line of lines.slice(index + 1)) {
    const value = line.trim();
    if (value && !value.startsWith('#') && !value.includes('=')) return value;
  }

  return '';
}

export async function getOneDriveConfig(): Promise<OneDriveConfig> {
  const rawEnv = await readEnvFallback();
  const clientId = clean(process.env.ONEDRIVE_CLIENT_ID) || nextValueAfterLabel(rawEnv, 'Id. de aplicación (cliente)');
  const clientSecret = clean(process.env.ONEDRIVE_CLIENT_SECRET) || nextValueAfterLabel(rawEnv, 'valor secreto de cliente');
  const tenantId = clean(process.env.ONEDRIVE_TENANT_ID) || 'common';
  const folderPath = clean(process.env.ONEDRIVE_FOLDER_PATH) || '/FacturacionRespaldos';

  if (!clientId || !clientSecret) {
    throw new Error('Faltan ONEDRIVE_CLIENT_ID y ONEDRIVE_CLIENT_SECRET en .env.');
  }

  return { clientId, clientSecret, tenantId, folderPath };
}

export function oneDriveAuthorizeUrl(config: OneDriveConfig, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'offline_access Files.ReadWrite',
    state,
  });

  return `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize?${params.toString()}`;
}

async function postToken(config: OneDriveConfig, params: Record<string, string>) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    ...params,
  });

  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json().catch(() => ({})) as TokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'No se pudo autenticar con OneDrive.');
  }

  return data;
}

export async function exchangeOneDriveCode(config: OneDriveConfig, code: string, redirectUri: string) {
  return await postToken(config, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
}

export async function refreshOneDriveToken(config: OneDriveConfig, refreshToken: string) {
  return await postToken(config, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

function graphBackupPath(folderPath: string, filename: string) {
  const parts = folderPath.split('/').map((part) => part.trim()).filter(Boolean);
  parts.push(filename);
  return parts.map((part) => encodeURIComponent(part)).join('/');
}

function oneDriveFolderParts(folderPath: string) {
  return folderPath.split('/').map((part) => part.trim()).filter(Boolean);
}

async function graphJsonRequest<T>(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({})) as T & GraphDriveItem;
  return { response, data };
}

async function ensureOneDriveFolderPath(config: OneDriveConfig, accessToken: string) {
  const parts = oneDriveFolderParts(config.folderPath);
  let currentPath = '';

  for (const part of parts) {
    const encodedPath = currentPath
      ? `${currentPath}/${encodeURIComponent(part)}`
      : encodeURIComponent(part);

    const check = await graphJsonRequest<GraphDriveItem>(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}`,
      accessToken,
    );

    if (check.response.ok) {
      currentPath = encodedPath;
      continue;
    }

    const parentUrl = currentPath
      ? `https://graph.microsoft.com/v1.0/me/drive/root:/${currentPath}:/children`
      : 'https://graph.microsoft.com/v1.0/me/drive/root/children';

    const created = await graphJsonRequest<GraphDriveItem>(parentUrl, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        name: part,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    });

    if (!created.response.ok && created.data.error?.message) {
      const recheck = await graphJsonRequest<GraphDriveItem>(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedPath}`,
        accessToken,
      );
      if (!recheck.response.ok) throw new Error(created.data.error.message);
    } else if (!created.response.ok) {
      throw new Error('No se pudo crear la carpeta en OneDrive.');
    }

    currentPath = encodedPath;
  }
}

export async function uploadBackupToOneDrive(config: OneDriveConfig, accessToken: string, filename: string, content: BodyInit, mimeType = 'application/json; charset=utf-8') {
  await ensureOneDriveFolderPath(config, accessToken);
  const graphPath = graphBackupPath(config.folderPath, filename);
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${graphPath}:/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
    },
    body: content,
  });

  const data = await response.json().catch(() => ({})) as GraphDriveItem;

  if (!response.ok) {
    throw new Error(data.error?.message || 'No se pudo subir el respaldo a OneDrive.');
  }

  return data;
}
