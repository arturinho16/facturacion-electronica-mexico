import { createHash } from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

const EXPEDIENTE_DIR = 'expediente_fiscal';

function safePart(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'archivo';
}

export function expedienteRootPath() {
  return path.join(process.cwd(), EXPEDIENTE_DIR);
}

export function expedienteAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), relativePath);
}

export async function saveExpedienteFile(input: {
  perfil: string;
  tipo: string;
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}) {
  const hash = createHash('sha256').update(input.buffer).digest('hex');
  const perfil = safePart(input.perfil);
  const tipo = safePart(input.tipo);
  const dir = path.join(expedienteRootPath(), perfil, tipo);
  await mkdir(dir, { recursive: true });

  const parsed = path.parse(input.fileName || 'documento.pdf');
  const ext = safePart(parsed.ext || '.pdf');
  const base = safePart(parsed.name || 'documento');
  const name = `${Date.now()}_${base}${ext.startsWith('.') ? ext : `.${ext}`}`;
  const absolutePath = path.join(dir, name);
  await writeFile(absolutePath, input.buffer);

  return {
    relativePath: path.relative(process.cwd(), absolutePath),
    hash,
    size: input.buffer.byteLength,
    fileName: input.fileName || name,
    mimeType: input.mimeType || 'application/octet-stream',
  };
}
