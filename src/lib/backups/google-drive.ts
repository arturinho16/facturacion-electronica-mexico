export type GoogleDriveConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  folderId: string;
  folderName: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUploadResponse = {
  id?: string;
  name?: string;
  webViewLink?: string;
  error?: {
    message?: string;
  };
};

type GoogleFolderResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  files?: Array<{ id: string; name: string }>;
  error?: {
    message?: string;
  };
};

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : '';
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  const clientId = clean(process.env.GOOGLE_DRIVE_CLIENT_ID);
  const clientSecret = clean(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
  const redirectUri = clean(process.env.GOOGLE_DRIVE_REDIRECT_URI);
  const folderId = clean(process.env.GOOGLE_DRIVE_FOLDER_ID);
  const folderName = clean(process.env.GOOGLE_DRIVE_FOLDER_NAME) || folderId || 'FacturacionRespaldos';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Faltan GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET o GOOGLE_DRIVE_REDIRECT_URI en .env.');
  }

  return { clientId, clientSecret, redirectUri, folderId, folderName };
}

export function googleDriveAuthorizeUrl(config: GoogleDriveConfig, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function postToken(params: Record<string, string>) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  const data = await response.json().catch(() => ({})) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'No se pudo autenticar con Google Drive.');
  }

  return data;
}

export async function exchangeGoogleDriveCode(config: GoogleDriveConfig, code: string) {
  return await postToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code,
  });
}

export async function refreshGoogleDriveToken(config: GoogleDriveConfig, refreshToken: string) {
  return await postToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

async function googleDriveRequest<T>(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({})) as T & GoogleFolderResponse;
  return { response, data };
}

async function getFolderById(accessToken: string, folderId: string) {
  if (!folderId) return '';

  const encodedId = encodeURIComponent(folderId);
  const { response, data } = await googleDriveRequest<GoogleFolderResponse>(
    `https://www.googleapis.com/drive/v3/files/${encodedId}?fields=id,name,mimeType&supportsAllDrives=true`,
    accessToken,
  );

  if (!response.ok || data.mimeType !== 'application/vnd.google-apps.folder') return '';
  return data.id || '';
}

async function findFolderByName(accessToken: string, folderName: string) {
  const escapedName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name)',
    spaces: 'drive',
  });

  const { response, data } = await googleDriveRequest<GoogleFolderResponse>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    accessToken,
  );

  if (!response.ok) throw new Error(data.error?.message || 'No se pudo buscar la carpeta en Google Drive.');
  return data.files?.[0]?.id || '';
}

async function createFolder(accessToken: string, folderName: string) {
  const { response, data } = await googleDriveRequest<GoogleFolderResponse>(
    'https://www.googleapis.com/drive/v3/files?fields=id,name',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    },
  );

  if (!response.ok || !data.id) throw new Error(data.error?.message || 'No se pudo crear la carpeta en Google Drive.');
  return data.id;
}

async function resolveGoogleDriveFolderId(config: GoogleDriveConfig, accessToken: string) {
  const byId = await getFolderById(accessToken, config.folderId);
  if (byId) return byId;

  const byName = await findFolderByName(accessToken, config.folderName);
  if (byName) return byName;

  return await createFolder(accessToken, config.folderName);
}

export async function uploadBackupToGoogleDrive(config: GoogleDriveConfig, accessToken: string, filename: string, content: string | Buffer, mimeType = 'application/json') {
  const boundary = `backup_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const folderId = await resolveGoogleDriveFolderId(config, accessToken);
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType,
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const data = await response.json().catch(() => ({})) as GoogleUploadResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || 'No se pudo subir el respaldo a Google Drive.');
  }

  return data;
}
