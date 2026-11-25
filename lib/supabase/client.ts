'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from '../supabase';

/**
 * Browser-side Supabase client using @supabase/ssr cookie storage.
 */
export function createBrowserSupabaseClient() {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }

  return createBrowserClient(url, anonKey);
}
