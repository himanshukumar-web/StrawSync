import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../../lib/supabase';

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mode: 'unconfigured' });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
