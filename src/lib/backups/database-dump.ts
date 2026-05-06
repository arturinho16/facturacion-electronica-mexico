import { spawn } from 'child_process';

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está configurada.');
  const cleanUrl = url.trim().replace(/^['"]|['"]$/g, '');

  try {
    const parsed = new URL(cleanUrl);
    parsed.searchParams.delete('schema');
    return parsed.toString();
  } catch {
    return cleanUrl.replace(/([?&])schema=[^&]*&?/, '$1').replace(/[?&]$/, '');
  }
}

function runCommandWithInput(command: string, args: string[], input?: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, PGPASSWORD: undefined },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8'));
        return;
      }

      reject(new Error(Buffer.concat(stderr).toString('utf8') || `${command} terminó con código ${code}`));
    });

    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

export function nombreArchivoRespaldoBD(date = new Date()) {
  return `respaldo-bd-completa-${date.toISOString().replace(/[:.]/g, '-')}.sql`;
}

export async function crearRespaldoBDCompleta() {
  return await runCommandWithInput('pg_dump', [
    databaseUrl(),
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ]);
}

export async function restaurarRespaldoBDCompleta(sql: string) {
  if (!sql.trim()) throw new Error('El archivo SQL está vacío.');
  await runCommandWithInput('psql', [databaseUrl()], sql);
}
