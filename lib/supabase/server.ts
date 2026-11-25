import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseConfig, isSupabaseConfigured } from '../supabase';
import { UserRole } from '../../types';

export interface VerifiedAuthProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  account_status: 'active' | 'suspended';
  organization: string | null;
  location: string | null;
  is_verified: boolean;
}

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Always instantiate per request so cookies and cache headers remain isolated.
 */
export function createServerSupabaseClient() {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Safe to ignore in Server Components; middleware refreshes session cookies.
        }
      },
    },
  });
}

/**
 * Verifies the user against Supabase Auth (never trusts getSession() or user_metadata)
 * and loads authoritative role/account_status from public.profiles.
 */
export async function getServerAuthContext(): Promise<{
  configured: boolean;
  userId: string | null;
  profile: VerifiedAuthProfile | null;
}> {
  if (!isSupabaseConfigured()) {
    return { configured: false, userId: null, profile: null };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { configured: true, userId: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, account_status, organization, location, is_verified')
    .eq('id', user.id)
    .single<VerifiedAuthProfile>();

  return {
    configured: true,
    userId: user.id,
    profile: profile ?? null,
  };
}

/**
 * Server-side role gate for protected pages and actions.
 */
export async function requireServerRole(allowedRoles: UserRole[]): Promise<VerifiedAuthProfile | null> {
  const { configured, userId, profile } = await getServerAuthContext();
  if (!configured) return null;

  if (!userId || !profile) {
    redirect('/login');
  }
  if (profile.account_status !== 'active') {
    redirect('/login?error=account_suspended');
  }
  if (!allowedRoles.includes(profile.role)) {
    redirect(`/${profile.role}/dashboard`);
  }

  return profile;
}
