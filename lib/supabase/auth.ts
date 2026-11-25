import { createBrowserSupabaseClient } from './client';
import { getSiteUrl } from '../supabase';
import type { UserRole } from '../../types';

export type PublicSignupRole = Exclude<UserRole, 'admin'>;

export interface SignupParams {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: PublicSignupRole;
  organization?: string;
  location?: string;
}

/**
 * Registers a user with Supabase Auth. Admin role is explicitly rejected in both client and DB trigger.
 */
export async function signUpWithEmail(params: SignupParams) {
  if (!(['farmer', 'buyer', 'logistics'] as const).includes(params.role)) {
    throw new Error('Public registration is restricted to farmer, buyer, and logistics roles.');
  }

  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      data: {
        full_name: params.fullName.trim(),
        phone: params.phone.trim(),
        role: params.role,
        organization: params.organization?.trim() || null,
        location: params.location?.trim() || null,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Signs in with email/password and validates active status + server-stored role from public.profiles.
 */
export async function signInWithEmail(email: string, password: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Authentication succeeded without a user record.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, account_status, organization, location, is_verified')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error('User profile record not found.');
  }

  if (profile.account_status !== 'active') {
    await supabase.auth.signOut();
    throw new Error('This account has been suspended. Contact an administrator.');
  }

  return {
    user: data.user,
    profile,
    redirectTo: `/${profile.role}/dashboard`,
  };
}

export async function signOutUser() {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) throw error;
}

export async function updateAuthenticatedPassword(newPassword: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

export async function getCurrentAuthProfile() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, account_status, organization, location, is_verified')
    .eq('id', user.id)
    .single();

  return profile ?? null;
}
