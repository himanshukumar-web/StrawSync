import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type {
  AdminAuditLog,
  BaleType,
  BuyerDemand,
  CropType,
  LandAreaUnit,
  ListingCategory,
  ListingStatus,
  OrderStatus,
  PaymentMethod,
  PlatformNotification,
  PurchaseOrder,
  ResidueListing,
  SavedCalculation,
  UserProfile,
  UserRole,
  WeightUnit,
} from '../types';

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim() || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

export function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL?.trim() || '';
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    throw new Error(
      'Neon DATABASE_URL is not configured. Add DATABASE_URL to .env.local and run `npm run db:init`.'
    );
  }
  if (!cachedSql) {
    cachedSql = neon(url);
  }
  return cachedSql;
}

export function normalizeIdentifier(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(-10);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function mapUserRow(row: Record<string, any>): UserProfile {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    role: row.role as UserRole,
    phone: String(row.phone || ''),
    email: String(row.email || ''),
    organization: row.organization || undefined,
    location: String(row.location || ''),
    coordinates: {
      lat: Number(row.lat ?? 30.3742),
      lng: Number(row.lng ?? 75.8712),
    },
    isVerified: Boolean(row.is_verified),
    status: (row.account_status as 'active' | 'suspended') || 'active',
    upiId: row.upi_id || undefined,
    bankAccountNumber: row.bank_account_number || undefined,
    ifscCode: row.ifsc_code || undefined,
    bankHolderName: row.bank_holder_name || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapListingRow(row: Record<string, any>): ResidueListing {
  return {
    id: String(row.id),
    farmerId: String(row.farmer_id),
    farmerName: String(row.farmer_name),
    farmerPhone: String(row.farmer_phone || ''),
    village: String(row.location || ''),
    district: String(row.district || ''),
    state: String(row.state || ''),
    coordinates: {
      lat: Number(row.lat ?? 30.3742),
      lng: Number(row.lng ?? 75.8712),
    },
    cropType: row.crop_type as CropType,
    cropName: String(row.crop_name || row.crop_type),
    category: (row.category as ListingCategory) || 'crop_residue',
    landAreaAcres: Number(row.land_area_acres ?? row.land_area ?? 0),
    landAreaUnit: (row.land_unit as LandAreaUnit) || 'acre',
    originalLandArea: Number(row.land_area ?? 0),
    estimatedGrossTonnes: Number(row.estimated_gross_tonnes ?? row.quantity_tonnes ?? 0),
    recoverableTonnes: Number(row.quantity_tonnes ?? 0),
    originalQuantity: Number(row.original_quantity ?? row.quantity_tonnes ?? 0),
    weightUnit: (row.weight_unit as WeightUnit) || 'tonne',
    pricePerUnit: Number(row.price_per_unit ?? row.price_per_tonne ?? 0),
    expectedPricePerTonne: Number(row.price_per_tonne ?? 0),
    imageUrl: row.image_url || undefined,
    moisturePercentage: Number(row.moisture_percentage ?? 14),
    baleType: (row.bale_type as BaleType) || 'baled',
    harvestDate: String(row.harvest_date || ''),
    collectionStartDate: String(row.collection_start_date || row.harvest_date || ''),
    collectionEndDate: String(row.pickup_deadline || ''),
    qualityScore: (row.quality_score as 'A' | 'B' | 'C') || 'A',
    status: (row.status === 'active' ? 'verified' : row.status) as ListingStatus,
    notes: row.instructions || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapDemandRow(row: Record<string, any>): BuyerDemand {
  return {
    id: String(row.id),
    buyerId: String(row.buyer_id),
    companyName: String(row.company_name || row.buyer_name),
    contactPerson: String(row.buyer_name),
    contactPhone: String(row.contact_phone || ''),
    plantLocation: {
      address: String(row.address || row.delivery_location || ''),
      district: String(row.district || row.delivery_location || ''),
      state: String(row.state || ''),
      coordinates: {
        lat: Number(row.lat ?? 29.3909),
        lng: Number(row.lng ?? 76.9635),
      },
    },
    cropType: row.crop_type as CropType,
    requiredTonnes: Number(row.required_tonnes ?? 0),
    fulfilledTonnes: Number(row.fulfilled_tonnes ?? 0),
    maxDeliveredPricePerTonne: Number(row.max_price_per_tonne ?? 0),
    maxMoisturePercentage: Number(row.max_moisture_percentage ?? 25),
    deadlineDate: String(row.deadline_date || ''),
    status:
      (row.status === 'open' ? 'active' : row.status) as BuyerDemand['status'],
    industryType: (row.industry_type as BuyerDemand['industryType']) || 'Bio-Pellet Plant',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapOrderRow(row: Record<string, any>): PurchaseOrder {
  const pickupCoords: [number, number] =
    Array.isArray(row.pickup_coords) && row.pickup_coords.length >= 2
      ? [Number(row.pickup_coords[0]), Number(row.pickup_coords[1])]
      : [30.3742, 75.8712];
  const dropCoords: [number, number] =
    Array.isArray(row.drop_coords) && row.drop_coords.length >= 2
      ? [Number(row.drop_coords[0]), Number(row.drop_coords[1])]
      : [29.3909, 76.9635];
  const currentTruckCoords: [number, number] =
    Array.isArray(row.current_truck_coords) && row.current_truck_coords.length >= 2
      ? [Number(row.current_truck_coords[0]), Number(row.current_truck_coords[1])]
      : pickupCoords;

  return {
    id: String(row.id),
    orderNumber: String(row.order_number || row.id),
    listingId: String(row.listing_id || ''),
    demandId: String(row.demand_id || ''),
    buyerId: String(row.buyer_id),
    buyerName: String(row.buyer_name),
    farmerId: String(row.farmer_id),
    farmerName: String(row.farmer_name),
    farmerPhone: String(row.farmer_phone || ''),
    logisticsPartnerId: row.logistics_partner_id || undefined,
    logisticsPartnerName: row.logistics_partner_name || undefined,
    cropType: row.crop_type as CropType,
    quantityTonnes: Number(row.quantity_tonnes ?? 0),
    displayQuantity:
      row.display_quantity !== null && row.display_quantity !== undefined
        ? Number(row.display_quantity)
        : Number(row.quantity_tonnes ?? 0),
    weightUnit: (row.weight_unit as WeightUnit) || 'tonne',
    farmgateRate: Number(row.farmgate_rate ?? row.price_per_tonne ?? 0),
    freightRate: Number(row.freight_rate ?? 0),
    totalDeliveredRate: Number(row.total_delivered_rate ?? row.price_per_tonne ?? 0),
    farmerTotalPayout: Number(row.farmer_total_payout ?? 0),
    logisticsTotalPayout: Number(row.logistics_total_payout ?? 0),
    buyerTotalBill: Number(row.total_amount ?? 0),
    pickupLocation: {
      village: String(row.pickup_location || ''),
      district: String(row.pickup_district || ''),
      state: String(row.pickup_state || ''),
      lat: Number(pickupCoords[0]),
      lng: Number(pickupCoords[1]),
    },
    deliveryLocation: {
      facility: String(row.delivery_location || ''),
      district: String(row.delivery_district || ''),
      state: String(row.delivery_state || ''),
      lat: Number(dropCoords[0]),
      lng: Number(dropCoords[1]),
    },
    pickupCoords,
    dropCoords,
    currentTruckCoords,
    gpsProgressPercent: Number(row.gps_progress_percent ?? 0),
    lastGpsUpdatedAt: row.last_gps_updated_at
      ? new Date(row.last_gps_updated_at).toISOString()
      : undefined,
    vehicleNumber: row.vehicle_number || undefined,
    driverName: row.driver_name || undefined,
    distanceKm: Number(row.distance_km ?? 50),
    vehicleType: String(row.vehicle_type || 'Standard Haulage Truck'),
    status: row.status as OrderStatus,
    paymentStatus: (row.payment_status as PurchaseOrder['paymentStatus']) || 'awaiting_logistics',
    paymentMethod: (row.payment_method as PaymentMethod) || undefined,
    escrowPaymentReference: row.payment_reference || undefined,
    settledPayoutTarget: row.settled_payout_target || undefined,
    utrNumber: row.utr_number || undefined,
    settledAt: row.settled_at ? new Date(row.settled_at).toISOString() : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : undefined,
    buyerConfirmedAt: row.buyer_confirmed_at
      ? new Date(row.buyer_confirmed_at).toISOString()
      : undefined,
    weighbridgeNetTonnes:
      row.weighbridge_net_tonnes !== null && row.weighbridge_net_tonnes !== undefined
        ? Number(row.weighbridge_net_tonnes)
        : undefined,
    weighbridgeSlipId: row.weighbridge_slip_id || undefined,
    trackingTimeline: Array.isArray(row.tracking_timeline) ? row.tracking_timeline : [],
    co2SavedTonnes: Number(row.co2_saved_tonnes ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    estimatedDeliveryDate: String(row.estimated_delivery_date || ''),
    cancelledReason: row.cancelled_reason || undefined,
    disputeNotes: row.dispute_notes || undefined,
    disputeStatus: (row.dispute_status as PurchaseOrder['disputeStatus']) || 'none',
    adjustments:
      row.adjustments !== null && row.adjustments !== undefined
        ? Number(row.adjustments)
        : undefined,
    deliveryProofUrl: row.delivery_proof_url || undefined,
    deliveryProofNote: row.delivery_proof_note || undefined,
  };
}

export function mapNotificationRow(row: Record<string, any>): PlatformNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    message: String(row.message),
    type: (row.type as PlatformNotification['type']) || 'order',
    orderId: row.order_id || undefined,
    read: Boolean(row.is_read),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapSavedCalcRow(row: Record<string, any>): SavedCalculation {
  return {
    id: String(row.id),
    mode: row.mode === 'buyer' ? 'buyer' : 'farmer',
    cropType: row.crop_type as CropType,
    cropName: String(row.crop_name || row.crop_type),
    landAreaValue: Number(row.land_area ?? 0),
    landAreaUnit: (row.land_unit as LandAreaUnit) || 'acre',
    landAreaAcres: Number(row.land_area_acres ?? row.land_area ?? 0),
    baleType: (row.bale_type as BaleType) || 'baled',
    moisturePercent:
      row.moisture_percent !== null && row.moisture_percent !== undefined
        ? Number(row.moisture_percent)
        : undefined,
    quantityValue: Number(row.quantity_value ?? row.recoverable_tonnes ?? 0),
    weightUnit: (row.weight_unit as WeightUnit) || 'tonne',
    quantityTonnes: Number(row.recoverable_tonnes ?? 0),
    pricePerUnit: Number(row.price_per_unit ?? row.price_per_tonne ?? 0),
    pricePerTonne: Number(row.price_per_tonne ?? 0),
    distanceKm:
      row.distance_km !== null && row.distance_km !== undefined ? Number(row.distance_km) : undefined,
    freightTotal:
      row.freight_total !== null && row.freight_total !== undefined
        ? Number(row.freight_total)
        : undefined,
    materialTotal:
      row.material_total !== null && row.material_total !== undefined
        ? Number(row.material_total)
        : undefined,
    estimatedValue: Number(row.estimated_value ?? 0),
    co2SavedTonnes:
      row.co2_saved_tonnes !== null && row.co2_saved_tonnes !== undefined
        ? Number(row.co2_saved_tonnes)
        : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export function mapAuditLogRow(row: Record<string, any>): AdminAuditLog {
  return {
    id: String(row.id),
    adminId: String(row.admin_id || ''),
    adminName: String(row.admin_name || 'Admin'),
    action: String(row.action),
    entityType: (row.entity_type as AdminAuditLog['entityType']) || 'order',
    entityId: String(row.target_id || ''),
    previousValue: row.previous_value || undefined,
    newValue: row.details || undefined,
    reason: row.reason || undefined,
    timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}
