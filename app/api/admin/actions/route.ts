import { NextRequest, NextResponse } from 'next/server';
import { mapListingRow, mapUserRow } from '../../../../lib/db';
import { insertAuditLog, requireDbAndUser } from '../../../../lib/api-utils';
import type { UserRole } from '../../../../types';

export async function POST(req: NextRequest) {
  const auth = await requireDbAndUser(req, ['admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'toggle_user_status') {
      const targetId = String(body.userId || '');
      const rows = await sql`SELECT * FROM users WHERE id = ${targetId} LIMIT 1`;
      if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const nextStatus = rows[0].account_status === 'active' ? 'suspended' : 'active';
      const updated = await sql`
        UPDATE users SET account_status = ${nextStatus} WHERE id = ${targetId} RETURNING *
      `;
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'UPDATE_USER',
        entityType: 'user',
        targetId,
        previousValue: rows[0].account_status,
        details: nextStatus,
        reason: 'Administrative oversight toggle',
      });
      return NextResponse.json({ user: mapUserRow(updated[0]) });
    }

    if (action === 'verify_user') {
      const targetId = String(body.userId || '');
      const updated = await sql`
        UPDATE users SET is_verified = TRUE WHERE id = ${targetId} RETURNING *
      `;
      if (!updated[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'UPDATE_USER',
        entityType: 'user',
        targetId,
        details: 'Verified KYC status',
      });
      return NextResponse.json({ user: mapUserRow(updated[0]) });
    }

    if (action === 'change_user_role') {
      const targetId = String(body.userId || '');
      const newRole = String(body.newRole || '') as UserRole;
      if (!['farmer', 'buyer', 'logistics', 'admin'].includes(newRole)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      const updated = await sql`
        UPDATE users SET role = ${newRole} WHERE id = ${targetId} RETURNING *
      `;
      if (!updated[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'UPDATE_USER',
        entityType: 'user',
        targetId,
        details: `role=${newRole}`,
      });
      return NextResponse.json({ user: mapUserRow(updated[0]) });
    }

    if (action === 'verify_listing') {
      const listingId = String(body.listingId || '');
      const updated = await sql`
        UPDATE farmer_listings SET status = 'verified' WHERE id = ${listingId} RETURNING *
      `;
      if (!updated[0]) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'VERIFY_LISTING',
        entityType: 'listing',
        targetId: listingId,
        details: 'verified',
        reason: 'Quality & satellite plot verification passed',
      });
      return NextResponse.json({ listing: mapListingRow(updated[0]) });
    }

    if (action === 'reject_listing') {
      const listingId = String(body.listingId || '');
      const reason = String(body.reason || 'Quality mismatch');
      const updated = await sql`
        UPDATE farmer_listings
        SET status = 'pending', instructions = ${`Rejected: ${reason}`}
        WHERE id = ${listingId}
        RETURNING *
      `;
      if (!updated[0]) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'REJECT_LISTING',
        entityType: 'listing',
        targetId: listingId,
        details: `rejected: ${reason}`,
        reason,
      });
      return NextResponse.json({ listing: mapListingRow(updated[0]) });
    }

    return NextResponse.json({ error: `Unsupported admin action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[api/admin/actions POST]', err);
    return NextResponse.json({ error: 'Admin action failed.' }, { status: 500 });
  }
}
