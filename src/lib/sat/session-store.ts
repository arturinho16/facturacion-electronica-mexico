type SatSession = {
    rfc: string;
    rfcNombre?: string;
    password: string;
    cerBase64: string;
    keyBase64: string;
    createdAt: number;
    updatedAt: number;
};

const globalForSat = globalThis as typeof globalThis & {
    __SAT_SESSION__?: SatSession | null;
    __SAT_SESSIONS_BY_PERFIL__?: Record<string, SatSession | undefined>;
};

export function setSatSession(input: {
    rfc: string;
    rfcNombre?: string;
    password: string;
    cerBase64: string;
    keyBase64: string;
    perfilClave?: string;
}) {
    const now = Date.now();
    const perfilClave = input.perfilClave || 'principal';
    const current = getSatSession(perfilClave);

    const session = {
        rfc: input.rfc,
        rfcNombre: input.rfcNombre,
        password: input.password,
        cerBase64: input.cerBase64,
        keyBase64: input.keyBase64,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
    };

    globalForSat.__SAT_SESSIONS_BY_PERFIL__ = {
        ...(globalForSat.__SAT_SESSIONS_BY_PERFIL__ || {}),
        [perfilClave]: session,
    };

    if (perfilClave === 'principal') {
        globalForSat.__SAT_SESSION__ = session;
    }

    return session;
}

export function getSatSession(perfilClave = 'principal'): SatSession | null {
    return globalForSat.__SAT_SESSIONS_BY_PERFIL__?.[perfilClave] ?? (perfilClave === 'principal' ? globalForSat.__SAT_SESSION__ ?? null : null);
}

export function clearSatSession(perfilClave = 'principal') {
    if (globalForSat.__SAT_SESSIONS_BY_PERFIL__) {
        delete globalForSat.__SAT_SESSIONS_BY_PERFIL__[perfilClave];
    }

    if (perfilClave === 'principal') {
        globalForSat.__SAT_SESSION__ = null;
    }
}

export function getSatCredentialsAsBinary(perfilClave = 'principal'):
    | {
        rfc: string;
        rfcNombre?: string;
        password: string;
        cerString: string;
        keyString: string;
    }
    | null {
    const session = getSatSession(perfilClave);

    if (!session) return null;

    return {
        rfc: session.rfc,
        rfcNombre: session.rfcNombre,
        password: session.password,
        cerString: Buffer.from(session.cerBase64, 'base64').toString('binary'),
        keyString: Buffer.from(session.keyBase64, 'base64').toString('binary'),
    };
}
