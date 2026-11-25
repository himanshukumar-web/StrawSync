import { NextRequest, NextResponse } from 'next/server';
import { mapUserRow } from '../../../../lib/db';
import { requireDbAndUser } from '../../../../lib/api-utils';

export async function PATCH(req: NextRequest) {
  const auth = await requireDbAndUser(req, ['farmer', 'buyer', 'logistics', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json();
    const targetUserId = user.role === 'admin' && body.userId ? String(body.userId) : user.id;

    if (user.role !== 'admin' && targetUserId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: only the account owner can update payout details.' },
        { status: 403 }
      );
    }

    const upi = String(body.upiId || '').trim();
    const bankAcc = String(body.bankAccountNumber || '').trim();
    const ifsc = String(body.ifscCode || '').trim().toUpperCase();
    const holder = String(body.bankHolderName || user.name).trim();

    if (!upi && !(bankAcc && ifsc)) {
      return NextResponse.json(
        { error: 'Please enter a valid UPI ID or Bank Account Number with IFSC code.' },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE users
      SET
        upi_id = ${upi || null},
        bank_account_number = ${bankAcc || null},
        ifsc_code = ${ifsc || null},
        bank_holder_name = ${holder || null}
      WHERE id = ${targetUserId}
      RETURNING *
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: mapUserRow(rows[0]) });
  } catch (err) {
    console.error('[api/profile/payout PATCH]', err);
    return NextResponse.json({ error: 'Failed to update payout details.' }, { status: 500 });
  }
}
