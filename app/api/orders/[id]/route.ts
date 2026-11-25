import { NextRequest, NextResponse } from 'next/server';
import { mapOrderRow } from '../../../../lib/db';
import { insertAuditLog, insertNotification, requireDbAndUser } from '../../../../lib/api-utils';
import type { OrderStatus, PaymentMethod } from '../../../../types';

const POST_LOGISTICS_STATUSES: OrderStatus[] = [
  'logistics_assigned',
  'pickup_en_route',
  'loaded_and_weighed',
  'in_transit',
  'delivered',
];

function defaultProgressForStatus(status: OrderStatus): number {
  switch (status) {
    case 'logistics_assigned':
      return 15;
    case 'pickup_en_route':
      return 30;
    case 'loaded_and_weighed':
      return 50;
    case 'in_transit':
      return 70;
    case 'delivered':
    case 'settled':
      return 100;
    default:
      return 0;
  }
}

function interpolateCoords(
  pickup: [number, number],
  drop: [number, number],
  progressPercent: number
): [number, number] {
  const pct = Math.max(0, Math.min(100, progressPercent)) / 100;
  return [
    Number((pickup[0] + (drop[0] - pickup[0]) * pct).toFixed(5)),
    Number((pickup[1] + (drop[1] - pickup[1]) * pct).toFixed(5)),
  ];
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await requireDbAndUser(req);
  if (auth.error) return auth.error;
  const { user, sql } = auth;
  const orderId = context.params.id;

  try {
    const orderRows = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
    const row = orderRows[0];
    if (!row) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const order = mapOrderRow(row);
    const pickupCoords: [number, number] = order.pickupCoords || [
      order.pickupLocation.lat,
      order.pickupLocation.lng,
    ];
    const dropCoords: [number, number] = order.dropCoords || [
      order.deliveryLocation.lat,
      order.deliveryLocation.lng,
    ];
    const body = await req.json();
    const action = String(body.action || '');
    const nowIso = new Date().toISOString();
    const nowShort = new Date(nowIso).toLocaleDateString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const timeline = Array.isArray(order.trackingTimeline) ? [...order.trackingTimeline] : [];

    if (action === 'accept') {
      if (user.role !== 'admin' && (user.role !== 'farmer' || order.farmerId !== user.id)) {
        return NextResponse.json(
          { error: 'Forbidden: only the listing farmer or admin can accept this request.' },
          { status: 403 }
        );
      }
      if (order.status !== 'requested') {
        return NextResponse.json({ error: 'Order is no longer in requested state.' }, { status: 400 });
      }

      if (order.listingId) {
        const listingRows = await sql`
          SELECT * FROM farmer_listings WHERE id = ${order.listingId} LIMIT 1
        `;
        const listing = listingRows[0];
        if (listing) {
          const remaining = Math.max(0, Number((Number(listing.quantity_tonnes) - order.quantityTonnes).toFixed(3)));
          const unit = String(listing.weight_unit || 'tonne');
          const origRemaining =
            unit === 'kg'
              ? Math.round(remaining * 1000)
              : unit === 'quintal'
              ? Number((remaining * 10).toFixed(1))
              : Number(remaining.toFixed(2));
          await sql`
            UPDATE farmer_listings
            SET
              quantity_tonnes = ${remaining},
              original_quantity = ${origRemaining},
              status = ${remaining <= 0 ? 'sold' : 'matched'}
            WHERE id = ${order.listingId}
          `;
        }
      }

      if (timeline[1]) {
        timeline[1] = {
          ...timeline[1],
          timestamp: 'Awaiting Logistics',
          notes: 'Farmer confirmed residue availability and accepted purchase request. Ready for logistics dispatch.',
        };
      }

      const updated = await sql`
        UPDATE orders
        SET status = 'accepted', tracking_timeline = ${JSON.stringify(timeline)}::jsonb
        WHERE id = ${orderId}
        RETURNING *
      `;

      await insertNotification(sql, {
        userId: order.buyerId,
        title: `Request Accepted (#${order.orderNumber})`,
        message: `${order.farmerName} accepted your request for ${order.quantityTonnes}t ${order.cropType.toUpperCase()}.`,
        type: 'success',
        orderId,
      });

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'reject') {
      if (user.role !== 'admin' && (user.role !== 'farmer' || order.farmerId !== user.id)) {
        return NextResponse.json(
          { error: 'Forbidden: only the listing farmer or admin can reject this request.' },
          { status: 403 }
        );
      }
      const reason = String(body.reason || 'Residue unavailable or price mismatch');

      const updated = await sql`
        UPDATE orders
        SET status = 'cancelled', cancelled_reason = ${`Rejected by Farmer: ${reason}`}
        WHERE id = ${orderId}
        RETURNING *
      `;

      if (order.demandId) {
        await sql`
          UPDATE buyer_requests
          SET
            fulfilled_tonnes = GREATEST(0, COALESCE(fulfilled_tonnes, 0) - ${order.quantityTonnes}),
            status = CASE
              WHEN GREATEST(0, COALESCE(fulfilled_tonnes, 0) - ${order.quantityTonnes}) > 0 THEN 'partially_fulfilled'
              ELSE 'active'
            END
          WHERE id = ${order.demandId}
        `;
      }

      if (order.listingId) {
        await sql`
          UPDATE farmer_listings
          SET status = CASE WHEN quantity_tonnes > 0 AND status <> 'sold' THEN 'verified' ELSE status END
          WHERE id = ${order.listingId}
        `;
      }

      await insertNotification(sql, {
        userId: order.buyerId,
        title: `Request Declined (#${order.orderNumber})`,
        message: `${order.farmerName} declined your request: ${reason}`,
        type: 'warning',
        orderId,
      });

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'status' || action === 'assign_logistics') {
      const canAct =
        user.role === 'admin' ||
        (user.role === 'logistics' && (!order.logisticsPartnerId || order.logisticsPartnerId === user.id));
      if (!canAct) {
        return NextResponse.json(
          { error: 'Forbidden: only assigned logistics or admin can update dispatch status.' },
          { status: 403 }
        );
      }

      const nextStatus = (
        action === 'assign_logistics' ? 'logistics_assigned' : String(body.status || order.status)
      ) as OrderStatus;
      const notes = body.notes ? String(body.notes) : undefined;
      const partnerId = String(
        body.logisticsId || order.logisticsPartnerId || (user.role === 'logistics' ? user.id : '')
      ) || null;
      const partnerName = String(
        body.logisticsName ||
          order.logisticsPartnerName ||
          (user.role === 'logistics' ? user.organization || user.name : '')
      ) || null;

      if (nextStatus === 'logistics_assigned' && timeline[1]) {
        timeline[1] = { ...timeline[1], completed: true, timestamp: nowShort, notes: notes || timeline[1].notes };
      } else if (nextStatus === 'pickup_en_route' && timeline[1]) {
        timeline[1] = { ...timeline[1], completed: true, timestamp: nowShort, notes: notes || timeline[1].notes };
      } else if (nextStatus === 'loaded_and_weighed' && timeline[2]) {
        timeline[2] = { ...timeline[2], completed: true, timestamp: nowShort, notes: notes || timeline[2].notes };
      } else if (nextStatus === 'in_transit' && timeline[3]) {
        timeline[3] = { ...timeline[3], completed: true, timestamp: nowShort, notes: notes || timeline[3].notes };
      } else if (nextStatus === 'delivered' && timeline[4]) {
        timeline[4] = { ...timeline[4], completed: true, timestamp: nowShort, notes: notes || timeline[4].notes };
      }

      const targetPct = Math.max(order.gpsProgressPercent || 0, defaultProgressForStatus(nextStatus));
      const nextCoords = interpolateCoords(pickupCoords, dropCoords, targetPct);

      const updated = await sql`
        UPDATE orders
        SET
          status = ${nextStatus},
          logistics_partner_id = ${partnerId},
          logistics_partner_name = ${partnerName},
          gps_progress_percent = ${targetPct},
          current_truck_coords = ${JSON.stringify(nextCoords)}::jsonb,
          last_gps_updated_at = ${targetPct > 0 ? nowIso : row.last_gps_updated_at},
          tracking_timeline = ${JSON.stringify(timeline)}::jsonb
        WHERE id = ${orderId}
        RETURNING *
      `;

      if (user.role === 'admin' && action === 'assign_logistics') {
        await insertAuditLog(sql, {
          adminId: user.id,
          adminName: user.name,
          action: 'ASSIGN_LOGISTICS',
          entityType: 'order',
          targetId: orderId,
          details: `Assigned to: ${partnerName || ''} (${partnerId || ''})`,
          reason: 'Capacity allocation & vehicle routing',
        });
      }

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'gps') {
      const canAct =
        user.role === 'admin' ||
        (user.role === 'logistics' && (!order.logisticsPartnerId || order.logisticsPartnerId === user.id));
      if (!canAct) {
        return NextResponse.json({ error: 'Forbidden: unauthorized GPS broadcast.' }, { status: 403 });
      }

      const progressPct = Math.max(0, Math.min(100, Math.round(Number(body.progressPercent ?? order.gpsProgressPercent))));
      const nextCoords: [number, number] =
        Array.isArray(body.coords) && body.coords.length === 2
          ? [Number(body.coords[0]), Number(body.coords[1])]
          : interpolateCoords(pickupCoords, dropCoords, progressPct);

      const partnerId = order.logisticsPartnerId || (user.role === 'logistics' ? user.id : null);
      const partnerName =
        order.logisticsPartnerName || (user.role === 'logistics' ? user.organization || user.name : null);

      const updated = await sql`
        UPDATE orders
        SET
          current_truck_coords = ${JSON.stringify(nextCoords)}::jsonb,
          gps_progress_percent = ${progressPct},
          vehicle_number = ${body.vehicleNumber ? String(body.vehicleNumber) : row.vehicle_number},
          driver_name = ${body.driverName ? String(body.driverName) : row.driver_name},
          logistics_partner_id = ${partnerId},
          logistics_partner_name = ${partnerName},
          last_gps_updated_at = ${nowIso}
        WHERE id = ${orderId}
        RETURNING *
      `;

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'deliver') {
      const canAct =
        user.role === 'admin' ||
        (user.role === 'logistics' && (!order.logisticsPartnerId || order.logisticsPartnerId === user.id));
      if (!canAct) {
        return NextResponse.json(
          { error: 'Unauthorized: only the assigned logistics partner or admin can mark delivery.' },
          { status: 403 }
        );
      }

      const slipId = String(body.slipId || order.weighbridgeSlipId || `WB-${order.orderNumber.slice(-4)}`).trim();
      const netTonnes = Number(body.netTonnes || order.weighbridgeNetTonnes || order.quantityTonnes);
      const noteText = String(
        body.notes || `Gate Entry Complete. Certified Weighbridge Slip #${slipId} (${netTonnes}t).`
      );
      const proofUrl = body.proofUrl ? String(body.proofUrl) : order.deliveryProofUrl || null;
      const nowDisplay = new Date(nowIso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      const nextTimeline = timeline.map((step, idx) =>
        idx <= 4
          ? {
              ...step,
              completed: true,
              timestamp: idx === 4 || !step.completed ? nowDisplay : step.timestamp,
              notes: idx === 4 ? noteText : step.notes,
            }
          : step
      );

      const nextStatus: OrderStatus = order.paymentStatus === 'settled' ? 'settled' : 'delivered';
      const nextPayStatus = order.paymentStatus === 'settled' ? 'settled' : 'pending_release';
      const partnerId = order.logisticsPartnerId || (user.role === 'logistics' ? user.id : null);
      const partnerName =
        order.logisticsPartnerName || (user.role === 'logistics' ? user.organization || user.name : null);

      const updated = await sql`
        UPDATE orders
        SET
          status = ${nextStatus},
          payment_status = ${nextPayStatus},
          delivered_at = ${nowIso},
          weighbridge_slip_id = ${slipId},
          weighbridge_net_tonnes = ${netTonnes},
          delivery_proof_url = ${proofUrl},
          delivery_proof_note = ${noteText},
          current_truck_coords = ${JSON.stringify(dropCoords)}::jsonb,
          gps_progress_percent = 100,
          last_gps_updated_at = ${nowIso},
          logistics_partner_id = ${partnerId},
          logistics_partner_name = ${partnerName},
          tracking_timeline = ${JSON.stringify(nextTimeline)}::jsonb
        WHERE id = ${orderId}
        RETURNING *
      `;

      const cropLabel = order.cropType.toUpperCase();
      await insertNotification(sql, {
        userId: order.farmerId,
        title: `Shipment Delivered! Order #${order.orderNumber}`,
        message: `Shipment Delivered! Order #${order.orderNumber} (${cropLabel}, ${netTonnes}t) has reached ${order.buyerName} via Slip #${slipId}. Awaiting Buyer confirmation & escrow release.`,
        type: 'delivery',
        orderId,
      });

      await insertNotification(sql, {
        userId: order.buyerId,
        title: `Cargo Arrived (#${order.orderNumber})`,
        message: `${netTonnes}t ${cropLabel} delivered at plant gate (Slip #${slipId}). Confirm receipt to settle farmer escrow payout.`,
        type: 'delivery',
        orderId,
      });

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'settle_payment') {
      const canSettle =
        user.role === 'admin' || (user.role === 'buyer' && order.buyerId === user.id);
      if (!canSettle) {
        return NextResponse.json(
          { error: 'Unauthorized: only the order buyer or an administrator can release escrow payout.' },
          { status: 403 }
        );
      }
      if (order.status === 'settled' || order.paymentStatus === 'settled') {
        return NextResponse.json(
          { error: 'Escrow payment has already been settled for this order.' },
          { status: 400 }
        );
      }
      if (!POST_LOGISTICS_STATUSES.includes(order.status)) {
        return NextResponse.json(
          { error: 'Escrow payment can only be initiated after Farmer approval and Logistics truck assignment.' },
          { status: 400 }
        );
      }

      const farmerRows = await sql`
        SELECT upi_id, bank_account_number, ifsc_code FROM users WHERE id = ${order.farmerId} LIMIT 1
      `;
      const farmer = farmerRows[0];
      const hasUpi = Boolean(farmer?.upi_id);
      const hasBank = Boolean(farmer?.bank_account_number);
      const defaultMethod: PaymentMethod = !hasUpi && hasBank ? 'IMPS/NEFT' : 'UPI';
      const paymentMethod = (body.paymentMethod || defaultMethod) as PaymentMethod;
      const payoutTarget = hasUpi
        ? String(farmer.upi_id)
        : hasBank
        ? `A/C ${farmer.bank_account_number} (${farmer.ifsc_code || 'IFSC'})`
        : 'Verified Kisan Bank Escrow';

      const utrNumber = String(body.utrNumber || `UTR${Date.now().toString().slice(-10)}`);
      const nowDisplay = new Date(nowIso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      const nextTimeline = timeline.map((step, idx) => ({
        ...step,
        completed: true,
        timestamp: idx === 5 ? nowDisplay : step.completed ? step.timestamp : nowDisplay,
        notes:
          idx === 5
            ? `Settled via ${paymentMethod} to ${payoutTarget} • UTR: ${utrNumber}`
            : step.notes,
      }));

      const nextStatus: OrderStatus = order.status === 'delivered' ? 'settled' : order.status;

      const updated = await sql`
        UPDATE orders
        SET
          status = ${nextStatus},
          payment_status = 'settled',
          payment_method = ${paymentMethod},
          payment_reference = ${body.paymentReference ? String(body.paymentReference) : row.payment_reference},
          settled_payout_target = ${payoutTarget},
          utr_number = ${utrNumber},
          buyer_confirmed_at = ${nowIso},
          settled_at = ${nowIso},
          delivered_at = ${order.deliveredAt || nowIso},
          tracking_timeline = ${JSON.stringify(nextTimeline)}::jsonb
        WHERE id = ${orderId}
        RETURNING *
      `;

      await insertNotification(sql, {
        userId: order.farmerId,
        title: `Payment Credited: ₹${order.farmerTotalPayout.toLocaleString('en-IN')}`,
        message: `Payment Credited: ₹${order.farmerTotalPayout.toLocaleString('en-IN')} settled to ${payoutTarget} for Order #${order.orderNumber} (UTR: ${utrNumber}).`,
        type: 'payment',
        orderId,
      });

      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'admin_cancel') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin role required.' }, { status: 403 });
      }
      const reason = String(body.reason || 'Cancelled by administrator');
      const updated = await sql`
        UPDATE orders SET status = 'cancelled', cancelled_reason = ${reason}
        WHERE id = ${orderId} RETURNING *
      `;
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'CANCEL_ORDER',
        entityType: 'order',
        targetId: orderId,
        details: `cancelled: ${reason}`,
        reason,
      });
      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    if (action === 'admin_resolve_dispute') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Admin role required.' }, { status: 403 });
      }
      const notes = String(body.resolutionNotes || '');
      const adjustment = Number(body.adjustment || 0);
      const updated = await sql`
        UPDATE orders
        SET dispute_status = 'resolved', dispute_notes = ${notes}, adjustments = ${adjustment}
        WHERE id = ${orderId} RETURNING *
      `;
      await insertAuditLog(sql, {
        adminId: user.id,
        adminName: user.name,
        action: 'RESOLVE_DISPUTE',
        entityType: 'order',
        targetId: orderId,
        details: `Resolved: ${notes}, Adjustment: ₹${adjustment}`,
        reason: notes,
      });
      return NextResponse.json({ order: mapOrderRow(updated[0]) });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('[api/orders PATCH]', err);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }
}
