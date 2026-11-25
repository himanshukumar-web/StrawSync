import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '../supabase';
import { UserRole } from '../../types';

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

export async function updateSessionAndEnforceRoutes(request: NextRequest) {
  const { url, anonKey, configured } = getSupabaseConfig();

  // Preserve current local experience cleanly when Supabase credentials are not yet configured.
  if (!configured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  // Always call getUser() immediately after createServerClient to refresh expired tokens safely.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRole(pathname);
  const isAuthPage = PUBLIC_AUTH_ROUTES.includes(pathname);

  if (!user) {
    if (requiredRole) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (!requiredRole && !isAuthPage) {
    return supabaseResponse;
  }

  // Authoritative role/status lookup from DB profiles table (never trust raw_user_meta_data).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .single<{ role: UserRole; account_status: 'active' | 'suspended' }>();

  if (!profile || profile.account_status !== 'active') {
    if (requiredRole) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('error', 'account_suspended');
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (isAuthPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = `/${profile.role}/dashboard`;
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  if (requiredRole && profile.role !== requiredRole) {
    const allowedUrl = request.nextUrl.clone();
    allowedUrl.pathname = `/${profile.role}/dashboard`;
    allowedUrl.search = '';
    return NextResponse.redirect(allowedUrl);
  }

  return supabaseResponse;
}
