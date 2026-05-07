import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import { getDefaultModulesByRole, isRootSuperUser, roleHasAllModules } from './permissions';

export async function getServerSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function requireModule(modulo: string) {
    const session = await getServerSession();
    if (!session) return { ok: false as const, status: 401, message: 'No autenticado.' };
    if (roleHasAllModules(session.rol) || isRootSuperUser(session.email)) {
        return { ok: true as const, session: { ...session, rol: isRootSuperUser(session.email) ? 'SUPERADMIN' as const : session.rol, modulos: getDefaultModulesByRole('SUPERADMIN') } };
    }
    if (!session.modulos.includes(modulo)) {
        return { ok: false as const, status: 403, message: `Sin permiso para el módulo ${modulo}.` };
    }
    return { ok: true as const, session };
}

export async function requireAdmin() {
    const session = await getServerSession();
    if (!session) return { ok: false as const, status: 401, message: 'No autenticado.' };
    if (!roleHasAllModules(session.rol) && !isRootSuperUser(session.email)) return { ok: false as const, status: 403, message: 'Solo ADMIN o SUPERADMIN.' };
    return { ok: true as const, session };
}
