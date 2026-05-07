import path from 'path';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);

export type SftpBackupConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
};

type SftpClientLike = {
  connect(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    readyTimeout: number;
  }): Promise<void>;
  end(): Promise<void>;
  list(remotePath: string): Promise<unknown>;
  mkdir(remotePath: string, recursive?: boolean): Promise<unknown>;
  put(input: Buffer, remotePath: string): Promise<unknown>;
};

type SftpClientConstructor = new (name?: string) => SftpClientLike;

export function buildSftpConfig(value: Record<string, unknown>): SftpBackupConfig {
  return {
    host: String(value.host ?? '').trim(),
    port: Number(value.port || 22),
    username: String(value.username ?? '').trim(),
    password: String(value.password ?? ''),
    remotePath: String(value.remotePath || '/').trim() || '/',
  };
}

export function validateSftpConfig(config: SftpBackupConfig) {
  if (!config.host || !config.username || !config.password) {
    throw new Error('Captura servidor, usuario y contraseña SFTP.');
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('El puerto SFTP debe estar entre 1 y 65535.');
  }
}

export async function withSftpClient<T>(config: SftpBackupConfig, task: (client: SftpClientLike) => Promise<T>) {
  validateSftpConfig(config);
  const SftpClient = nodeRequire(['ssh2', '-sftp-client'].join('')) as SftpClientConstructor;
  const client = new SftpClient('backup-sftp');

  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 15_000,
    });

    return await task(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function testSftpConnection(config: SftpBackupConfig) {
  return await withSftpClient(config, async (client) => {
    await client.list(config.remotePath);
  });
}

export async function uploadBackupToSftp(config: SftpBackupConfig, filename: string, content: string | Buffer) {
  return await withSftpClient(config, async (client) => {
    await client.mkdir(config.remotePath, true).catch(() => undefined);
    const remoteFile = path.posix.join(config.remotePath, filename);
    await client.put(Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'), remoteFile);
    return remoteFile;
  });
}
