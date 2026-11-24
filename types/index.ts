export type UserRole = 'farmer' | 'buyer' | 'logistics' | 'admin';

export type CropType = 'paddy' | 'wheat' | 'mustard' | 'sugarcane' | 'cotton' | 'maize';

export type ListingStatus = 'pending' | 'verified' | 'matched' | 'sold';

export type BaleType = 'baled' | 'loose' | 'chopped';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ResidueListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  village: string;
  district: string;
  state: string;
  coordinates: Coordinates;
  cropType: CropType;
  cropName: string;
  landAreaAcres: number;
  estimatedGrossTonnes: number;
  recoverableTonnes: number;
  moisturePercentage: number;
  baleType: BaleType;
  expectedPricePerTonne: number;
  harvestDate: string;
  collectionStartDate: string;
  collectionEndDate: string;
  qualityScore: 'A' | 'B' | 'C';
  status: ListingStatus;
  notes?: string;
  createdAt: string;
}

export interface BuyerDemand {
  id: string;
  buyerId: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  plantLocation: {
    address: string;
    district: string;
    state: string;
    coordinates: Coordinates;
  };
  cropType: CropType;
  requiredTonnes: number;
  fulfilledTonnes: number;
  maxDeliveredPricePerTonne: number;
  maxMoisturePercentage: number;
  deadlineDate: string;
  status: 'active' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
  industryType: 'Bio-Pellet Plant' | 'Ethanol Refinery' | 'Thermal Power Plant' | 'Paper Mill' | 'Brick Kiln';
  createdAt: string;
}

export interface VehicleOption {
  type: string;
  name: string;
  capacityTonnes: number;
  ratePerKm: number;
  baseLoadingCharge: number;
  co2PerKmKg: number;
}

export interface MatchScoreBreakdown {
  distanceScore: number;      // 0 - 30
  quantityScore: number;      // 0 - 25
  priceViabilityScore: number;// 0 - 25
  qualityScore: number;       // 0 - 20
  totalScore: number;         // 0 - 100
  reasons: string[];
}

export interface MatchResult {
  id: string;
  listingId: string;
  demandId: string;
  listing: ResidueListing;
  demand: BuyerDemand;
  matchScore: number;
  distanceKm: number;
  recommendedVehicle: VehicleOption;
  estimatedFreightPerTonne: number;
  farmgatePricePerTonne: number;
  estimatedDeliveredPricePerTonne: number;
  buyerMarginPerTonne: number;
  totalDeliveredCost: number;
  breakdown: MatchScoreBreakdown;
  co2SavedKg: number;
}

export type OrderStatus =
  | 'requested'
  | 'accepted'
  | 'logistics_assigned'
  | 'pickup_en_route'
  | 'loaded_and_weighed'
  | 'in_transit'
  | 'delivered'
  | 'settled'
  | 'cancelled'
  | 'disputed';

export interface TrackingStep {
  step: string;
  timestamp: string;
  completed: boolean;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  listingId: string;
  demandId: string;
  buyerId: string;
  buyerName: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  logisticsPartnerId?: string;
  logisticsPartnerName?: string;
  cropType: CropType;
  quantityTonnes: number;
  farmgateRate: number;
  freightRate: number;
  totalDeliveredRate: number;
  farmerTotalPayout: number;
  logisticsTotalPayout: number;
  buyerTotalBill: number;
  pickupLocation: {
    village: string;
    district: string;
    state: string;
    lat: number;
    lng: number;
  };
  deliveryLocation: {
    facility: string;
    district: string;
    state: string;
    lat: number;
    lng: number;
  };
  distanceKm: number;
  vehicleType: string;
  status: OrderStatus;
  trackingTimeline: TrackingStep[];
  co2SavedTonnes: number;
  createdAt: string;
  estimatedDeliveryDate: string;
  cancelledReason?: string;
  disputeNotes?: string;
  disputeStatus?: 'none' | 'open' | 'resolved';
  adjustments?: number;
  deliveryProofUrl?: string;
  deliveryProofNote?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  organization?: string;
  location: string;
  coordinates: Coordinates;
  isVerified: boolean;
  status?: 'active' | 'suspended';
  password?: string;
  createdAt?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: 'user' | 'listing' | 'order' | 'logistics' | 'settings';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

export interface PlatformSettings {
  platformFeePercent: number;
  requireListingApproval: boolean;
  autoAssignLogistics: boolean;
  maxDistanceKm: number;
  disputeResolutionWindowDays: number;
  smsAlertsEnabled: boolean;
}

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
}
