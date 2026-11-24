/**
 * Supabase Client Configuration
 * StrawSync supports direct Supabase PostgreSQL authentication & storage.
 * If credentials are not present in .env.local, StrawSync seamlessly falls back
 * to the persistent local state store (StrawSyncStore).
 */

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-supabase-project')
  );
};

export const getSupabaseConfig = () => {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    configured: isSupabaseConfigured(),
  };
};
