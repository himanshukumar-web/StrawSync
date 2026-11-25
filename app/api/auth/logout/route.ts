import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../../lib/supabase';
import { clearSessionCookie } from '../../../../lib/auth-server';

export async function POST() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // ignore optional supabase errors during cookie logout
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
