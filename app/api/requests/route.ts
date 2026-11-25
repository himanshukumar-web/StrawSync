import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSql, isDatabaseConfigured, mapDemandRow } from '../../../lib/db';
import { ensureDbInitialized } from '../../../lib/dbInit';
import { requireDbAndUser } from '../../../lib/api-utils';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ configured: false, requests: [] });
  }
  await ensureDbInitialized();
  const sql = getSql();
  const rows = await sql`SELECT * FROM buyer_requests ORDER BY created_at DESC`;
  return NextResponse.json({ configured: true, requests: rows.map(mapDemandRow) });
}

export async function POST(req: NextRequest) {
  const auth = await requireDbAndUser(req, ['buyer', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json();
    const id = String(body.id || `dem-${Date.now()}`);
    const requiredTonnes = Number(body.requiredTonnes ?? 0);
    const maxPrice = Number(body.maxDeliveredPricePerTonne ?? 0);

    if (!Number.isFinite(requiredTonnes) || requiredTonnes <= 0 || !Number.isFinite(maxPrice) || maxPrice <= 0) {
      return NextResponse.json({ error: 'Valid required quantity and ceiling price are required.' }, { status: 400 });
    }

    const plant = body.plantLocation || {};
    const rows = await sql`
      INSERT INTO buyer_requests (
        id, buyer_id, buyer_name, company_name, contact_phone, crop_type,
        required_tonnes, fulfilled_tonnes, max_price_per_tonne, max_moisture_percentage,
        delivery_location, address, district, state, lat, lng, deadline_date, industry_type, status
      ) VALUES (
        ${id},
        ${user.role === 'admin' && body.buyerId ? String(body.buyerId) : user.id},
        ${String(body.contactPerson || user.name)},
        ${String(body.companyName || user.organization || user.name)},
        ${String(body.contactPhone || user.phone || '')},
        ${String(body.cropType || 'paddy')},
        ${requiredTonnes},
        0,
        ${maxPrice},
        ${Number(body.maxMoisturePercentage ?? 25)},
        ${String(plant.district || plant.address || user.location || '')},
        ${String(plant.address || user.location || '')},
        ${String(plant.district || '')},
        ${String(plant.state || '')},
        ${Number(plant.coordinates?.lat ?? user.coordinates?.lat ?? 29.3909)},
        ${Number(plant.coordinates?.lng ?? user.coordinates?.lng ?? 76.9635)},
        ${String(body.deadlineDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0])},
        ${String(body.industryType || 'Bio-Pellet Plant')},
        'active'
      )
      RETURNING *
    `;

    return NextResponse.json({ demand: mapDemandRow(rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('[api/requests POST]', err);
    return NextResponse.json({ error: 'Failed to create buyer procurement request.' }, { status: 500 });
  }
}
