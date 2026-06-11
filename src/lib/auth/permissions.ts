export const MODULOS_SISTEMA = [
    'dashboard',
    'facturacion',
    'factura_global',
    'nomina',
    'clientes',
    'productos',
    'cotizaciones',
    'calculadoras',
    'descargas_sat',
    'consolidado_recibidas',
    'configuracion',
] as const;

export type ModuloSistema = (typeof MODULOS_SISTEMA)[number];
export type RolSistema = 'SUPERADMIN' | 'ADMIN' | 'OPERATIVO';

// Agregamos 'SUPERADMIN' a los tipos permitidos
export function getDefaultModulesByRole(rol: RolSistema): ModuloSistema[] {
    if (rol === 'SUPERADMIN' || rol === 'ADMIN') return [...MODULOS_SISTEMA];
    return ['dashboard', 'facturacion', 'factura_global', 'clientes', 'productos', 'cotizaciones', 'calculadoras'];
}

export function roleHasAllModules(rol: unknown) {
    const normalized = String(rol || '').replace(/[\s_-]/g, '').toUpperCase();
    return normalized === 'SUPERADMIN' || normalized === 'ADMIN';
}

export function isRootSuperUser(email: unknown) {
    return String(email || '').toLowerCase().trim() === 'admin@tufisti.com';
}

export function parseModules(input: unknown): ModuloSistema[] {
    const set = new Set(MODULOS_SISTEMA);

    // 1. Si el input ya es un arreglo (por si en el futuro lo cambias)
    if (Array.isArray(input)) {
        return input.filter((m): m is ModuloSistema => typeof m === 'string' && set.has(m as ModuloSistema));
    }

    // 2. Si el input es un Objeto JSON (Como viene actualmente de la base de datos)
    if (input !== null && typeof input === 'object') {
        return Object.keys(input).filter((key): key is ModuloSistema => {
            // Verifica que el módulo exista en la lista y que su valor sea 'true'
            return set.has(key as ModuloSistema) && (input as Record<string, unknown>)[key] === true;
        });
    }

    return [];
}
