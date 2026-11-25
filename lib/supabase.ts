/**
 * Supabase Client Configuration
 * Shared environment checks and public credentials resolver.
 * Keep strictly limited to NEXT_PUBLIC_* client-safe credentials.
 */

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    '';

  return (
    url.startsWith('https://') &&
    !url.includes('your-supabase-project') &&
    anonKey.length > 0 &&
    anonKey !== 'your-anon-key-here'
  );
};

export const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    '';

  return {
    url,
    anonKey,
    configured: isSupabaseConfigured(),
  };
};

export const getSiteUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};
