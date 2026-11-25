import { NextRequest, NextResponse } from 'next/server';
import { mapListingRow } from '../../../../lib/db';
import { insertAuditLog, requireDbAndUser } from '../../../../lib/api-utils';

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await requireDbAndUser(req, ['farmer', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;
  const listingId = context.params.id;

  try {
    const existingRows = await sql`
      SELECT * FROM farmer_listings WHERE id = ${listingId} LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.farmer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: you can only modify your own listings.' },
        { status: 403 }
      );
    }

    const body = await req.json();

    const rows = await sql`
      UPDATE farmer_listings
      SET
        crop_type = ${body.cropType !== undefined ? String(body.cropType) : existing.crop_type},
        crop_name = ${body.cropName !== undefined ? String(body.cropName) : existing.crop_name},
        category = ${body.category !== undefined ? String(body.category) : existing.category},
        original_quantity = ${body.originalQuantity !== undefined ? Number(body.originalQuantity) : Number(existing.original_quantity)},
        weight_unit = ${body.weightUnit !== undefined ? String(body.weightUnit) : existing.weight_unit},
        quantity_tonnes = ${body.recoverableTonnes !== undefined ? Number(body.recoverableTonnes) : Number(existing.quantity_tonnes)},
        estimated_gross_tonnes = ${body.estimatedGrossTonnes !== undefined ? Number(body.estimatedGrossTonnes) : Number(existing.estimated_gross_tonnes)},
        price_per_unit = ${body.pricePerUnit !== undefined ? Number(body.pricePerUnit) : Number(existing.price_per_unit)},
        price_per_tonne = ${body.expectedPricePerTonne !== undefined ? Number(body.expectedPricePerTonne) : Number(existing.price_per_tonne)},
        land_area = ${body.originalLandArea !== undefined ? Number(body.originalLandArea) : Number(existing.land_area)},
        land_unit = ${body.landAreaUnit !== undefined ? String(body.landAreaUnit) : existing.land_unit},
        land_area_acres = ${body.landAreaAcres !== undefined ? Number(body.landAreaAcres) : Number(existing.land_area_acres)},
        moisture_percentage = ${body.moisturePercentage !== undefined ? Number(body.moisturePercentage) : Number(existing.moisture_percentage)},
        bale_type = ${body.baleType !== undefined ? String(body.baleType) : existing.bale_type},
        quality_score = ${body.qualityScore !== undefined ? String(body.qualityScore) : existing.quality_score},
        location = ${body.village !== undefined ? String(body.village) : existing.location},
        district = ${body.district !== undefined ? String(body.district) : existing.district},
        state = ${body.state !== undefined ? String(body.state) : existing.state},
        image_url = ${body.imageUrl !== undefined ? (body.imageUrl ? String(body.imageUrl) : null) : existing.image_url},
        status = ${body.status !== undefined ? String(body.status) : existing.status},
        pickup_deadline = ${body.collectionEndDate !== undefined ? String(body.collectionEndDate) : existing.pickup_deadline},
        instructions = ${body.notes !== undefined ? (body.notes ? String(body.notes) : null) : existing.instructions}
      WHERE id = ${listingId}
      RETURNING *
    `;

    return NextResponse.json({ listing: mapListingRow(rows[0]) });
  } catch (err) {
    console.error('[api/listings PATCH]', err);
    return NextResponse.json({ error: 'Failed to update listing.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await requireDbAndUser(req, ['farmer', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;
  const listingId = context.params.id;

  try {
    const existingRows = await sql`
      SELECT id, farmer_id, crop_name FROM farmer_listings WHERE id = ${listingId} LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }
    if (user.role !== 'admin' && existing.farmer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: you can only delete your own listings.' },
        { status: 403 }
      );
    }

    await sql`DELETE FROM farmer_listings WHERE id = ${listingId}`;

    if (user.role === 'admin') {
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'DELETE_LISTING',
        entityType: 'listing',
        targetId: listingId,
        previousValue: String(existing.crop_name || listingId),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/listings DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete listing.' }, { status: 500 });
  }
}
