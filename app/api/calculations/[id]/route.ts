import { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured } from '../../../../lib/db';
import { getServerUser } from '../../../../lib/auth-server';

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ unconfigured: true }, { status: 503 });
  }
  const user = await getServerUser(req);
  const sql = getSql();
  const calcId = context.params.id;

  if (user?.role === 'admin') {
    await sql`DELETE FROM saved_calculations WHERE id = ${calcId}`;
  } else if (user) {
    await sql`
      DELETE FROM saved_calculations
      WHERE id = ${calcId} AND (user_id = ${user.id} OR user_id IS NULL)
    `;
  } else {
    await sql`DELETE FROM saved_calculations WHERE id = ${calcId} AND user_id IS NULL`;
  }

  return NextResponse.json({ ok: true });
}
