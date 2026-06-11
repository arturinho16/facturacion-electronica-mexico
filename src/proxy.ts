import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { isRootSuperUser, roleHasAllModules } from '@/lib/auth/permissions';

const EXPEDIENTE_FISCAL_ENABLED = false;

const routeModuleMap: Array<{ prefix: string; modulo: string }> = [
  { prefix: '/nomina', modulo: 'nomina' },
  { prefix: '/empleados', modulo: 'nomina' },
  { prefix: '/facturas/global', modulo: 'factura_global' },
  { prefix: '/facturas', modulo: 'facturacion' },
  { prefix: '/cotizaciones', modulo: 'cotizaciones' },
  { prefix: '/calculadoras', modulo: 'calculadoras' },
  { prefix: '/catalogos/clientes', modulo: 'clientes' },
  { prefix: '/catalogos/productos', modulo: 'productos' },
  { prefix: '/api/facturas-recibidas/consolidado', modulo: 'consolidado_recibidas' },
  { prefix: '/api/expediente-fiscal', modulo: 'expediente_fiscal' },
  { prefix: '/expediente-fiscal', modulo: 'expediente_fiscal' },
  { prefix: '/facturas-recibidas/consolidado', modulo: 'consolidado_recibidas' },
  { prefix: '/facturas-recibidas', modulo: 'descargas_sat' },
  { prefix: '/reportes', modulo: 'configuracion' },
  { prefix: '/configuracion', modulo: 'configuracion' },
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!EXPEDIENTE_FISCAL_ENABLED && (pathname.startsWith('/expediente-fiscal') || pathname.startsWith('/api/expediente-fiscal'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'El modulo de expediente fiscal esta pausado.' }, { status: 404 });
    }

    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) return NextResponse.next();

  const token = req.cookies.get('auth_session')?.value;
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyToken(token);
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (roleHasAllModules(session.rol) || isRootSuperUser(session.email)) {
    return NextResponse.next();
  }

  const match = routeModuleMap.find((x) => pathname.startsWith(x.prefix));
  if (match && !session.modulos.includes(match.modulo)) {
    const denied = new URL('/sin-permiso', req.url);
    denied.searchParams.set('modulo', match.modulo);
    return NextResponse.redirect(denied);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/public).*)'],
};
