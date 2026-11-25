import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import {
  getSql,
  isDatabaseConfigured,
  mapAuditLogRow,
  mapDemandRow,
  mapListingRow,
  mapNotificationRow,
  mapOrderRow,
  mapSavedCalcRow,
  mapUserRow,
} from '../../../lib/db';
import { ensureDbInitialized } from '../../../lib/dbInit';
import { getServerUser } from '../../../lib/auth-server';
import type { EscrowTransaction, UserProfile } from '../../../types';

function redactOtherUser(u: UserProfile): UserProfile {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    phone: '',
    email: '',
    organization: u.organization,
    location: u.location,
    coordinates: u.coordinates,
    isVerified: u.isVerified,
    status: u.status,
    createdAt: u.createdAt,
  };
}

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    await ensureDbInitialized();
    const user = await getServerUser(req);
    const sql = getSql();

    const [listingRows, demandRows, userRows] = await Promise.all([
      sql`SELECT * FROM farmer_listings ORDER BY created_at DESC`,
      sql`SELECT * FROM buyer_requests ORDER BY created_at DESC`,
      sql`
        SELECT id, name, phone, email, role, organization, location, lat, lng,
               upi_id, bank_account_number, ifsc_code, bank_holder_name,
               is_verified, account_status, created_at
        FROM users
        ORDER BY created_at ASC
      `,
    ]);

    const mappedUsers = userRows.map(mapUserRow).map((u) => {
      if (user?.role === 'admin' || (user && u.id === user.id)) {
        return u;
      }
      return redactOtherUser(u);
    });

    let orderRows: Record<string, any>[] = [];
    let notifRows: Record<string, any>[] = [];
    let calcRows: Record<string, any>[] = [];
    let auditRows: Record<string, any>[] = [];

    if (user) {
      if (user.role === 'admin') {
        [orderRows, notifRows, calcRows, auditRows] = await Promise.all([
          sql`SELECT * FROM orders ORDER BY created_at DESC`,
          sql`SELECT * FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`,
          sql`SELECT * FROM saved_calculations WHERE user_id = ${user.id} OR user_id IS NULL ORDER BY created_at DESC LIMIT 30`,
          sql`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100`,
        ]);
      } else if (user.role === 'farmer') {
        [orderRows, notifRows, calcRows] = await Promise.all([
          sql`SELECT * FROM orders WHERE farmer_id = ${user.id} ORDER BY created_at DESC`,
          sql`SELECT * FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`,
          sql`SELECT * FROM saved_calculations WHERE user_id = ${user.id} OR user_id IS NULL ORDER BY created_at DESC LIMIT 30`,
        ]);
      } else if (user.role === 'buyer') {
        [orderRows, notifRows, calcRows] = await Promise.all([
          sql`SELECT * FROM orders WHERE buyer_id = ${user.id} ORDER BY created_at DESC`,
          sql`SELECT * FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`,
          sql`SELECT * FROM saved_calculations WHERE user_id = ${user.id} OR user_id IS NULL ORDER BY created_at DESC LIMIT 30`,
        ]);
      } else {
        // logistics
        [orderRows, notifRows, calcRows] = await Promise.all([
          sql`
            SELECT * FROM orders
            WHERE logistics_partner_id = ${user.id}
               OR status IN ('accepted', 'logistics_assigned', 'pickup_en_route', 'loaded_and_weighed', 'in_transit', 'delivered', 'settled')
            ORDER BY created_at DESC
          `,
          sql`SELECT * FROM notifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`,
          sql`SELECT * FROM saved_calculations WHERE user_id = ${user.id} OR user_id IS NULL ORDER BY created_at DESC LIMIT 30`,
        ]);
      }
    } else {
      calcRows = await sql`
        SELECT * FROM saved_calculations WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 20
      `;
    }

    const orders = orderRows.map(mapOrderRow);
    const transactions: EscrowTransaction[] = orders
      .filter((o) => o.paymentStatus === 'settled')
      .map((o) => ({
        id: `txn-${o.id}`,
        orderId: o.id,
        orderNumber: o.orderNumber,
        buyerId: o.buyerId,
        farmerId: o.farmerId,
        farmerName: o.farmerName,
        amount: o.farmerTotalPayout,
        paymentMethod: o.paymentMethod || 'UPI',
        payoutDestination: o.settledPayoutTarget || 'Verified Kisan Bank Escrow',
        utrNumber: o.utrNumber || '',
        status: 'settled',
        settledAt: o.settledAt || o.createdAt,
      }));

    return NextResponse.json({
      configured: true,
      user,
      users: mappedUsers,
      listings: listingRows.map(mapListingRow),
      demands: demandRows.map(mapDemandRow),
      orders,
      notifications: notifRows.map(mapNotificationRow),
      calculations: calcRows.map(mapSavedCalcRow),
      auditLogs: auditRows.map(mapAuditLogRow),
      transactions,
    });
  } catch (err) {
    console.error('[api/bootstrap GET]', err);
    return NextResponse.json(
      { configured: true, error: 'Failed to load StrawSync data.' },
      { status: 500 }
    );
  }
}
