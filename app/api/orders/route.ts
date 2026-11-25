import { NextRequest, NextResponse } from 'next/server';
import { mapOrderRow } from '../../../lib/db';
import { insertNotification, requireDbAndUser } from '../../../lib/api-utils';

export async function POST(req: NextRequest) {
  const auth = await requireDbAndUser(req, ['buyer', 'admin']);
  if (auth.error) return auth.error;
  const { user, sql } = auth;

  try {
    const body = await req.json();
    const listingId = String(body.listingId || '');
    const demandId = String(body.demandId || '');

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID is required.' }, { status: 400 });
    }

    const listingRows = await sql`
      SELECT * FROM farmer_listings WHERE id = ${listingId} LIMIT 1
    `;
    const listing = listingRows[0];
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    }

    const availableTonnes = Number(listing.quantity_tonnes ?? 0);
    if (availableTonnes <= 0) {
      return NextResponse.json(
        { error: 'This listing has no remaining stock available.' },
        { status: 400 }
      );
    }

    const requestedTonnes = Number(body.quantityTonnes ?? Math.min(availableTonnes, 30));
    const qty = Math.max(0.01, Number(Math.min(requestedTonnes, availableTonnes).toFixed(3)));
    const weightUnit = String(body.weightUnit || listing.weight_unit || 'tonne');
    const displayQty = Number(body.displayQuantity ?? qty);

    const farmgateRate = Number(body.farmgateRate ?? listing.price_per_tonne ?? 0);
    const freightRate = Number(body.freightRate ?? 0);
    const totalDeliveredRate = Number(body.totalDeliveredRate ?? farmgateRate + freightRate);
    const farmgateTotal = Math.round(qty * farmgateRate);
    const freightTotal = Math.round(qty * freightRate);
    const totalAmount = farmgateTotal + freightTotal;

    const pickupCoords = Array.isArray(body.pickupCoords)
      ? body.pickupCoords
      : [Number(listing.lat ?? 30.3742), Number(listing.lng ?? 75.8712)];
    const dropCoords = Array.isArray(body.dropCoords)
      ? body.dropCoords
      : [Number(user.coordinates?.lat ?? 29.3909), Number(user.coordinates?.lng ?? 76.9635)];

    const orderId = String(body.id || `ord-${Date.now()}`);
    const orderNumber = String(
      body.orderNumber || `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`
    );
    const buyerId = user.role === 'admin' && body.buyerId ? String(body.buyerId) : user.id;
    const buyerName =
      user.role === 'admin' && body.buyerName
        ? String(body.buyerName)
        : user.organization || user.name;

    const nowDisplay = new Date().toLocaleDateString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const timeline = Array.isArray(body.trackingTimeline) && body.trackingTimeline.length > 0
      ? body.trackingTimeline
      : [
          {
            step: 'Purchase Request Submitted by Buyer',
            timestamp: nowDisplay,
            completed: true,
            notes: `Awaiting confirmation from ${listing.farmer_name}.`,
          },
          {
            step: 'Farmer Confirmation & Vehicle Dispatch',
            timestamp: 'Pending Farmer Approval',
            completed: false,
            notes: `Assigned vehicle class: ${String(body.vehicleType || 'Standard Haulage Truck')}`,
          },
          {
            step: 'Loaded & Weighed on Certified Weighbridge',
            timestamp: 'Pending Arrival',
            completed: false,
          },
          {
            step: 'In Transit to Buyer Facility',
            timestamp: 'Pending Transit',
            completed: false,
          },
          {
            step: 'Gate Entry & Unloading',
            timestamp: 'Pending Delivery',
            completed: false,
          },
          {
            step: 'Quality Test & Payout Settlement',
            timestamp: 'Pending Settlement',
            completed: false,
          },
        ];

    const inserted = await sql`
      INSERT INTO orders (
        id, order_number, listing_id, demand_id,
        farmer_id, farmer_name, farmer_phone,
        buyer_id, buyer_name,
        crop_type, quantity_tonnes, display_quantity, weight_unit,
        price_per_tonne, farmgate_rate, freight_rate, total_delivered_rate,
        farmer_total_payout, logistics_total_payout, total_amount,
        delivery_location, delivery_district, delivery_state,
        pickup_location, pickup_district, pickup_state,
        distance_km, vehicle_type, status, payment_status,
        vehicle_number, driver_name,
        pickup_coords, drop_coords, current_truck_coords, gps_progress_percent,
        tracking_timeline, co2_saved_tonnes, estimated_delivery_date
      ) VALUES (
        ${orderId},
        ${orderNumber},
        ${listingId},
        ${demandId || null},
        ${String(listing.farmer_id)},
        ${String(listing.farmer_name)},
        ${String(listing.farmer_phone || '')},
        ${buyerId},
        ${buyerName},
        ${String(listing.crop_type)},
        ${qty},
        ${displayQty},
        ${weightUnit},
        ${totalDeliveredRate},
        ${farmgateRate},
        ${freightRate},
        ${totalDeliveredRate},
        ${farmgateTotal},
        ${freightTotal},
        ${totalAmount},
        ${String(body.deliveryFacility || user.organization || user.location || 'Buyer Facility')},
        ${String(body.deliveryDistrict || '')},
        ${String(body.deliveryState || '')},
        ${String(listing.location || '')},
        ${String(listing.district || '')},
        ${String(listing.state || '')},
        ${Number(body.distanceKm ?? 50)},
        ${String(body.vehicleType || 'Standard Haulage Truck')},
        'requested',
        'awaiting_logistics',
        ${String(body.vehicleNumber || 'PB-13-TR-4421')},
        ${String(body.driverName || 'Sukhdev Singh')},
        ${JSON.stringify(pickupCoords)}::jsonb,
        ${JSON.stringify(dropCoords)}::jsonb,
        ${JSON.stringify(pickupCoords)}::jsonb,
        0,
        ${JSON.stringify(timeline)}::jsonb,
        ${Number(body.co2SavedTonnes ?? 0)},
        ${String(body.estimatedDeliveryDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0])}
      )
      RETURNING *
    `;

    if (demandId) {
      await sql`
        UPDATE buyer_requests
        SET
          fulfilled_tonnes = LEAST(required_tonnes, COALESCE(fulfilled_tonnes, 0) + ${qty}),
          status = CASE
            WHEN COALESCE(fulfilled_tonnes, 0) + ${qty} >= required_tonnes THEN 'fulfilled'
            ELSE 'partially_fulfilled'
          END
        WHERE id = ${demandId}
      `;
    }

    await insertNotification(sql, {
      userId: String(listing.farmer_id),
      title: `New Purchase Request #${orderNumber}`,
      message: `${buyerName} requested ${displayQty} ${weightUnit} of ${listing.crop_name || listing.crop_type} (₹${farmgateTotal.toLocaleString('en-IN')}).`,
      type: 'order',
      orderId,
    });

    return NextResponse.json({ order: mapOrderRow(inserted[0]) }, { status: 201 });
  } catch (err) {
    console.error('[api/orders POST]', err);
    return NextResponse.json({ error: 'Failed to create purchase request.' }, { status: 500 });
  }
}
