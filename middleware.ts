import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session-jwt';
import { updateSessionAndEnforceRoutes } from './lib/supabase/middleware';
import type { UserRole } from './types';

const PROTECTED_ROLE_PREFIXES: Array<{ prefix: string; role: UserRole }> = [
  { prefix: '/farmer', role: 'farmer' },
  { prefix: '/buyer', role: 'buyer' },
  { prefix: '/logistics', role: 'logistics' },
  { prefix: '/admin', role: 'admin' },
];

const PUBLIC_AUTH_ROUTES = ['/login', '/register'];

function getRequiredRole(pathname: string): UserRole | null {
  const match = PROTECTED_ROLE_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match ? match.role : null;
}

export async function middleware(request: NextRequest) {
  const dbUrl = process.env.DATABASE_URL?.trim() || '';
  const hasNeonDb = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

  if (hasNeonDb) {
    const { pathname } = request.nextUrl;
    const requiredRole = getRequiredRole(pathname);
    const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname);
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value || '';
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      if (requiredRole) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    if (isAuthPage) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = `/${session.role}/dashboard`;
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }

    if (requiredRole && session.role !== 'admin' && session.role !== requiredRole) {
      const allowedUrl = request.nextUrl.clone();
      allowedUrl.pathname = `/${session.role}/dashboard`;
      allowedUrl.search = '';
      return NextResponse.redirect(allowedUrl);
    }

    return NextResponse.next();
  }

  return updateSessionAndEnforceRoutes(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (all Next.js internals, static files, image optimization, webpack-hmr)
     * - api routes
     * - favicon.ico
     * - public image assets
     */
    '/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
