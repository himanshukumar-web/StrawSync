import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getSql, isDatabaseConfigured, mapListingRow } from '../../../lib/db';
import { ensureDbInitialized } from '../../../lib/dbInit';
import { requireDbAndUser } from '../../../lib/api-utils';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ configured: false, listings: [] });
  }
  await ensureDbInitialized();
  const sql = getSql();
  const rows = await sql`SELECT * FROM farmer_listings ORDER BY created_at DESC`;
  return NextResponse.json({ configured: true, listings: rows.map(mapListingRow) });
}

export async function POST(req: NextRequest) {
  const auth = await requireDbAndUser(req, ['farmer', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json();
    const id = String(body.id || `list-${Date.now()}`);
    const farmerId = user.role === 'admin' && body.farmerId ? String(body.farmerId) : user.id;
    const farmerName =
      user.role === 'admin' && body.farmerName ? String(body.farmerName) : user.name;
    const farmerPhone =
      user.role === 'admin' && body.farmerPhone ? String(body.farmerPhone) : user.phone || '';

    const originalQty = Number(body.originalQuantity ?? body.recoverableTonnes ?? 0);
    const qtyTonnes = Number(body.recoverableTonnes ?? originalQty ?? 0);
    const estGross = Number(body.estimatedGrossTonnes ?? qtyTonnes);
    const pricePerUnit = Number(body.pricePerUnit ?? body.expectedPricePerTonne ?? 0);
    const pricePerTonne = Number(body.expectedPricePerTonne ?? pricePerUnit ?? 0);
    const landArea = Number(body.originalLandArea ?? body.landAreaAcres ?? 0);
    const landAcres = Number(body.landAreaAcres ?? landArea ?? 0);

    if (!Number.isFinite(qtyTonnes) || qtyTonnes <= 0 || !Number.isFinite(pricePerTonne) || pricePerTonne <= 0) {
      return NextResponse.json({ error: 'Valid quantity and price are required.' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO farmer_listings (
        id, farmer_id, farmer_name, farmer_phone, crop_type, crop_name, category,
        original_quantity, weight_unit, quantity_tonnes, estimated_gross_tonnes,
        price_per_unit, price_per_tonne, land_area, land_unit, land_area_acres,
        moisture_percentage, bale_type, quality_score, location, district, state,
        lat, lng, image_url, status, harvest_date, collection_start_date, pickup_deadline, instructions
      ) VALUES (
        ${id},
        ${farmerId},
        ${farmerName},
        ${farmerPhone},
        ${String(body.cropType || 'paddy')},
        ${String(body.cropName || body.cropType || 'Paddy Straw')},
        ${String(body.category || 'crop_residue')},
        ${originalQty},
        ${String(body.weightUnit || 'tonne')},
        ${qtyTonnes},
        ${estGross},
        ${pricePerUnit},
        ${pricePerTonne},
        ${landArea},
        ${String(body.landAreaUnit || 'acre')},
        ${landAcres},
        ${Number(body.moisturePercentage ?? 14)},
        ${String(body.baleType || 'baled')},
        ${String(body.qualityScore || 'A')},
        ${String(body.village || user.location || 'Punjab')},
        ${String(body.district || '')},
        ${String(body.state || '')},
        ${Number(body.coordinates?.lat ?? user.coordinates?.lat ?? 30.3742)},
        ${Number(body.coordinates?.lng ?? user.coordinates?.lng ?? 75.8712)},
        ${body.imageUrl ? String(body.imageUrl) : null},
        ${String(body.status || 'verified')},
        ${String(body.harvestDate || new Date().toISOString().split('T')[0])},
        ${String(body.collectionStartDate || new Date().toISOString().split('T')[0])},
        ${String(body.collectionEndDate || '')},
        ${body.notes ? String(body.notes) : null}
      )
      RETURNING *
    `;

    return NextResponse.json({ listing: mapListingRow(rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('[api/listings POST]', err);
    return NextResponse.json({ error: 'Failed to create listing.' }, { status: 500 });
  }
}
