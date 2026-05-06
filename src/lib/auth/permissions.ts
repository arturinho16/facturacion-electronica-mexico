export const MODULOS_SISTEMA = [
    'dashboard',
    'facturacion',
    'factura_global',
    'nomina',
    'clientes',
    'productos',
    'cotizaciones',
    'descargas_sat',
    'configuracion',
] as const;

export type ModuloSistema = (typeof MODULOS_SISTEMA)[number];

// Agregamos 'SUPERADMIN' a los tipos permitidos
export function getDefaultModulesByRole(rol: 'SUPERADMIN' | 'ADMIN' | 'OPERATIVO'): ModuloSistema[] {
    if (rol === 'SUPERADMIN' || rol === 'ADMIN') return [...MODULOS_SISTEMA];
    return ['dashboard', 'facturacion', 'factura_global', 'clientes', 'productos', 'cotizaciones'];
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
