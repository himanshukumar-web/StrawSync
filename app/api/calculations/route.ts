import { NextRequest, NextResponse } from 'next/server';
import { getSql, isDatabaseConfigured, mapSavedCalcRow } from '../../../lib/db';
import { getServerUser } from '../../../lib/auth-server';
import { requireDbAndUser } from '../../../lib/api-utils';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ unconfigured: true }, { status: 503 });
  }

  try {
    const user = await getServerUser(req);
    const body = await req.json();
    const id = String(body.id || `calc-${Date.now()}`);
    const sql = getSql();

    const rows = await sql`
      INSERT INTO saved_calculations (
        id, user_id, mode, crop_type, crop_name, land_area, land_unit, land_area_acres,
        bale_type, moisture_percent, quantity_value, weight_unit, recoverable_tonnes,
        price_per_unit, price_per_tonne, distance_km, freight_total, material_total,
        estimated_value, co2_saved_tonnes
      ) VALUES (
        ${id},
        ${user ? user.id : null},
        ${body.mode === 'buyer' ? 'buyer' : 'farmer'},
        ${String(body.cropType || 'paddy')},
        ${String(body.cropName || body.cropType || 'Paddy')},
        ${Number(body.landAreaValue ?? 0)},
        ${String(body.landAreaUnit || 'acre')},
        ${Number(body.landAreaAcres ?? 0)},
        ${String(body.baleType || 'baled')},
        ${body.moisturePercent !== undefined ? Number(body.moisturePercent) : null},
        ${Number(body.quantityValue ?? 0)},
        ${String(body.weightUnit || 'tonne')},
        ${Number(body.quantityTonnes ?? 0)},
        ${Number(body.pricePerUnit ?? 0)},
        ${Number(body.pricePerTonne ?? 0)},
        ${body.distanceKm !== undefined ? Number(body.distanceKm) : null},
        ${body.freightTotal !== undefined ? Number(body.freightTotal) : null},
        ${body.materialTotal !== undefined ? Number(body.materialTotal) : null},
        ${Number(body.estimatedValue ?? 0)},
        ${body.co2SavedTonnes !== undefined ? Number(body.co2SavedTonnes) : null}
      )
      RETURNING *
    `;

    return NextResponse.json({ calculation: mapSavedCalcRow(rows[0]) }, { status: 201 });
  } catch (err) {
    console.error('[api/calculations POST]', err);
    return NextResponse.json({ error: 'Failed to save calculation.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireDbAndUser(req);
  if (auth.error) return auth.error;
  const { user, sql } = auth;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Calculation id required.' }, { status: 400 });
  }
  await sql`
    DELETE FROM saved_calculations
    WHERE id = ${id} AND (user_id = ${user.id} OR user_id IS NULL)
  `;
  return NextResponse.json({ ok: true });
}
