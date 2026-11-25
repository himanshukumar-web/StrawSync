import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '../../../../lib/db';
import { getServerUser } from '../../../../lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ configured: false, user: null }, { status: 200 });
  }

  try {
    const user = await getServerUser(req);
    return NextResponse.json({ configured: true, user }, { status: 200 });
  } catch (err) {
    console.error('[api/auth/me]', err);
    return NextResponse.json({ configured: true, user: null }, { status: 200 });
  }
}
