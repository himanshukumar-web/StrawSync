import { NextResponse, type NextRequest } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase';

function sanitizeNextPath(rawNext: string | null): string | null {
  if (!rawNext || !rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return null;
  }
  return rawNext;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase_not_configured`);
  }

  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = sanitizeNextPath(searchParams.get('next'));

  const supabase = createServerSupabaseClient();
  let authSucceeded = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authSucceeded = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authSucceeded = !error;
  }

  if (!authSucceeded) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  if (requestedNext === '/reset-password' || type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  if (requestedNext) {
    return NextResponse.redirect(`${origin}${requestedNext}`);
  }

  // Resolve verified role server-side from public.profiles
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', user.id)
      .single<{ role: string; account_status: string }>();

    if (profile && profile.account_status === 'active') {
      return NextResponse.redirect(`${origin}/${profile.role}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
