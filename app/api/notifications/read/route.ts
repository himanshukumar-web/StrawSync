import { NextRequest, NextResponse } from 'next/server';
import { requireDbAndUser } from '../../../../lib/api-utils';

export async function POST(req: NextRequest) {
  const auth = await requireDbAndUser(req);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.id) {
      await sql`
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = ${String(body.id)} AND user_id = ${user.id}
      `;
    } else {
      await sql`
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = ${user.id}
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/notifications/read POST]', err);
    return NextResponse.json({ error: 'Failed to mark notifications read.' }, { status: 500 });
  }
}
