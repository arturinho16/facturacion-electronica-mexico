import { prisma } from '@/lib/prisma';

export const SAT_PERFILES = [
    { clave: 'principal', nombre: 'RFC principal', orden: 0, requiereConfiguracion: true },
    { clave: 'perfil_1', nombre: 'RFC-1', orden: 1, requiereConfiguracion: false },
    { clave: 'perfil_2', nombre: 'RFC-2', orden: 2, requiereConfiguracion: false },
    { clave: 'perfil_3', nombre: 'RFC-3', orden: 3, requiereConfiguracion: false },
] as const;

export type SatPerfilClave = (typeof SAT_PERFILES)[number]['clave'];

const PERFIL_CLAVES = new Set<string>(SAT_PERFILES.map((perfil) => perfil.clave));

export function normalizarPerfilClave(input: unknown): SatPerfilClave {
    const value = String(input || '').trim();
    return PERFIL_CLAVES.has(value) ? (value as SatPerfilClave) : 'principal';
}

export function getPerfilDefinition(clave: unknown) {
    const normalized = normalizarPerfilClave(clave);
    return SAT_PERFILES.find((perfil) => perfil.clave === normalized) || SAT_PERFILES[0];
}

export async function ensurePerfilDescargaSat(claveInput: unknown) {
    const perfil = getPerfilDefinition(claveInput);

    return prisma.perfilDescargaSat.upsert({
        where: { clave: perfil.clave },
        update: {
            nombre: perfil.nombre,
            orden: perfil.orden,
            activo: true,
        },
        create: {
            clave: perfil.clave,
            nombre: perfil.nombre,
            orden: perfil.orden,
            activo: true,
        },
    });
}

export async function updatePerfilSatIdentity(
    claveInput: unknown,
    data: { rfc?: string | null; rfcNombre?: string | null }
) {
    const perfil = await ensurePerfilDescargaSat(claveInput);

    return prisma.perfilDescargaSat.update({
        where: { id: perfil.id },
        data: {
            rfc: data.rfc ? data.rfc.trim().toUpperCase() : perfil.rfc,
            rfcNombre: data.rfcNombre ? data.rfcNombre.trim() : perfil.rfcNombre,
        },
    });
}
