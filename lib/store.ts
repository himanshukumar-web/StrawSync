import {
  UserRole,
  UserProfile,
  ResidueListing,
  BuyerDemand,
  PurchaseOrder,
  OrderStatus,
  MatchResult,
  AdminAuditLog,
  PlatformSettings,
  PlatformNotification,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_LISTINGS,
  INITIAL_DEMANDS,
  INITIAL_ORDERS,
} from './mockData';
import { estimateResidue, CROP_COEFFICIENTS } from './engine';

const STORAGE_KEYS = {
  CURRENT_USER: 'strawsync_current_user',
  USERS: 'strawsync_users',
  LISTINGS: 'strawsync_listings',
  DEMANDS: 'strawsync_demands',
  ORDERS: 'strawsync_orders',
  AUDIT_LOGS: 'strawsync_audit_logs',
  SETTINGS: 'strawsync_settings',
  NOTIFICATIONS: 'strawsync_notifications',
};

const DEFAULT_SETTINGS: PlatformSettings = {
  platformFeePercent: 2.5,
  requireListingApproval: false,
  autoAssignLogistics: true,
  maxDistanceKm: 150,
  disputeResolutionWindowDays: 7,
  smsAlertsEnabled: true,
};

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log-101',
    adminId: 'user-admin-1',
    adminName: 'Smt. Ananya Verma, IAS',
    action: 'PLATFORM_INITIALIZATION',
    entityType: 'settings',
    entityId: 'global',
    newValue: 'System online with CPCB co-firing guidelines active',
    reason: 'StrawSync Liquidity Engine launch',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'log-102',
    adminId: 'user-admin-1',
    adminName: 'Smt. Ananya Verma, IAS',
    action: 'VERIFY_FARMER_LISTING',
    entityType: 'listing',
    entityId: 'lst-1',
    previousValue: 'pending',
    newValue: 'verified',
    reason: 'Farmgate field coordinates & bale inspection verified via Sangrur KVK',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'log-103',
    adminId: 'user-admin-1',
    adminName: 'Smt. Ananya Verma, IAS',
    action: 'LOGISTICS_FLEET_APPROVAL',
    entityType: 'logistics',
    entityId: 'user-log-1',
    newValue: 'Fleet Certified (Tata 22ft & Ashok Leyland Multi-Axle)',
    reason: 'Transport safety and weighbridge integration approved',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying listener:', e);
    }
  });
}

function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Error reading key ${key} from localStorage:`, e);
    return fallback;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key ${key} to localStorage:`, e);
  }
}

export const StrawSyncStore = {
  // Subscribe to changes
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Users & Auth
  getCurrentUser(): UserProfile | null {
    return getFromStorage<UserProfile | null>(
      STORAGE_KEYS.CURRENT_USER,
      INITIAL_USERS[0] // Default to demo farmer Sardar Gurpreet Singh for immediate demo readiness
    );
  },

  setCurrentUser(user: UserProfile | null) {
    setToStorage(STORAGE_KEYS.CURRENT_USER, user);
    notifyListeners();
  },

  logout() {
    setToStorage(STORAGE_KEYS.CURRENT_USER, null);
    notifyListeners();
  },

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  },

  login(identifier: string, role: UserRole): UserProfile {
    const users = this.getAllUsers();
    // Match by phone, email, or role
    const matched = users.find(
      (u) =>
        (u.phone.includes(identifier) ||
          u.email.toLowerCase() === identifier.toLowerCase() ||
          u.role === role) &&
        u.role === role
    ) || INITIAL_USERS.find((u) => u.role === role) || users[0];

    this.setCurrentUser(matched);
    return matched;
  },

  hasRoleAccess(requiredRole: UserRole): boolean {
    const current = this.getCurrentUser();
    if (!current) return false;
    if (current.role === 'admin') return true; // Admin has oversight access
    return current.role === requiredRole;
  },

  switchRole(role: UserRole) {
    const users = this.getAllUsers();
    const found = users.find((u) => u.role === role) || INITIAL_USERS.find((u) => u.role === role);
    if (found) {
      this.setCurrentUser(found);
    }
  },

  getAllUsers(): UserProfile[] {
    return getFromStorage<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  },

  registerUser(profileData: Omit<UserProfile, 'id' | 'isVerified'>): UserProfile {
    const users = this.getAllUsers();
    // Admin cannot be registered publicly - enforce safety
    const safeRole: UserRole = profileData.role === 'admin' ? 'farmer' : profileData.role;

    const newUser: UserProfile = {
      ...profileData,
      role: safeRole,
      id: `user-${Date.now()}`,
      isVerified: true,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setToStorage(STORAGE_KEYS.USERS, users);
    this.setCurrentUser(newUser);

    this.addAuditLog({
      adminId: newUser.id,
      adminName: newUser.name,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: newUser.id,
      newValue: `Role: ${safeRole}, Organization: ${newUser.organization || 'Individual'}`,
      reason: 'Public onboarding flow',
    });

    notifyListeners();
    return newUser;
  },

  updateUser(id: string, updates: Partial<UserProfile>, adminName: string = 'System Admin'): UserProfile | null {
    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const previous = users[index];
    const updated = { ...previous, ...updates };
    users[index] = updated;
    setToStorage(STORAGE_KEYS.USERS, users);

    // If current logged-in user is updated, update session
    const current = this.getCurrentUser();
    if (current && current.id === id) {
      this.setCurrentUser(updated);
    }

    this.addAuditLog({
      adminId: 'admin-action',
      adminName,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: id,
      previousValue: JSON.stringify(previous),
      newValue: JSON.stringify(updates),
      reason: 'Administrative profile update',
    });

    notifyListeners();
    return updated;
  },

  toggleUserStatus(id: string, adminName: string = 'System Admin'): UserProfile | null {
    const user = this.getAllUsers().find((u) => u.id === id);
    if (!user) return null;
    const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
    return this.updateUser(id, { status: nextStatus }, adminName);
  },

  verifyUser(id: string, adminName: string = 'System Admin'): UserProfile | null {
    return this.updateUser(id, { isVerified: true }, adminName);
  },

  changeUserRole(id: string, newRole: UserRole, adminName: string = 'System Admin'): UserProfile | null {
    return this.updateUser(id, { role: newRole }, adminName);
  },

  requestPasswordReset(identifier: string): { success: boolean; message: string; resetToken?: string } {
    const users = this.getAllUsers();
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase().trim() ||
        u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, '').trim()
    );

    if (!user) {
      return {
        success: false,
        message: 'No registered StrawSync account found matching this email or phone number.',
      };
    }

    const token = `rst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      message: `Password reset verification token generated for ${user.email}. Use the token below to update credentials.`,
      resetToken: token,
    };
  },

  resetPassword(identifier: string, newPassword: string): boolean {
    const users = this.getAllUsers();
    const index = users.findIndex(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase().trim() ||
        u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, '').trim() ||
        u.id === identifier
    );

    if (index === -1) return false;
    users[index].password = newPassword;
    setToStorage(STORAGE_KEYS.USERS, users);
    notifyListeners();
    return true;
  },

  // Residue Listings
  getListings(): ResidueListing[] {
    return getFromStorage<ResidueListing[]>(
      STORAGE_KEYS.LISTINGS,
      INITIAL_LISTINGS
    );
  },

  getListingById(id: string): ResidueListing | undefined {
    return this.getListings().find((l) => l.id === id);
  },

  addListing(data: {
    cropType: ResidueListing['cropType'];
    landAreaAcres: number;
    expectedPricePerTonne: number;
    harvestDate: string;
    collectionStartDate: string;
    collectionEndDate: string;
    baleType: ResidueListing['baleType'];
    moisturePercentage?: number;
    village: string;
    district: string;
    state: string;
    coordinates?: { lat: number; lng: number };
    notes?: string;
  }): ResidueListing {
    const currentUser = this.getCurrentUser() || INITIAL_USERS[0];
    const estimates = estimateResidue(data.cropType, data.landAreaAcres, data.baleType);
    const coeff = CROP_COEFFICIENTS[data.cropType];

    // Default coords if not supplied
    const defaultCoords = {
      lat: 30.3742 + (Math.random() - 0.5) * 0.1,
      lng: 75.8712 + (Math.random() - 0.5) * 0.1,
    };

    const newListing: ResidueListing = {
      id: `list-${Date.now()}`,
      farmerId: currentUser.id,
      farmerName: currentUser.name,
      farmerPhone: currentUser.phone,
      village: data.village || 'Rampur Khurd',
      district: data.district || 'Sangrur',
      state: data.state || 'Punjab',
      coordinates: data.coordinates || defaultCoords,
      cropType: data.cropType,
      cropName: coeff.cropName,
      landAreaAcres: Number(data.landAreaAcres),
      estimatedGrossTonnes: estimates.grossTonnes,
      recoverableTonnes: estimates.recoverableTonnes,
      moisturePercentage: data.moisturePercentage || coeff.typicalMoisturePercent,
      baleType: data.baleType,
      expectedPricePerTonne: Number(data.expectedPricePerTonne),
      harvestDate: data.harvestDate,
      collectionStartDate: data.collectionStartDate,
      collectionEndDate: data.collectionEndDate,
      qualityScore: (data.moisturePercentage || coeff.typicalMoisturePercent) <= 14 ? 'A' : 'B',
      status: 'verified', // Auto-verified for seamless demonstration
      notes: data.notes || 'Listing registered via StrawSync Liquidity Portal.',
      createdAt: new Date().toISOString(),
    };

    const listings = this.getListings();
    listings.unshift(newListing);
    setToStorage(STORAGE_KEYS.LISTINGS, listings);
    notifyListeners();
    return newListing;
  },

  updateListingStatus(id: string, status: ResidueListing['status']) {
    const listings = this.getListings().map((l) =>
      l.id === id ? { ...l, status } : l
    );
    setToStorage(STORAGE_KEYS.LISTINGS, listings);
    notifyListeners();
  },

  deleteListing(id: string) {
    const listings = this.getListings().filter((l) => l.id !== id);
    setToStorage(STORAGE_KEYS.LISTINGS, listings);
    notifyListeners();
  },

  updateListing(id: string, updates: Partial<ResidueListing>): ResidueListing | null {
    const listings = this.getListings();
    const index = listings.findIndex((l) => l.id === id);
    if (index === -1) return null;

    const previous = listings[index];
    const updated = { ...previous, ...updates };
    listings[index] = updated;
    setToStorage(STORAGE_KEYS.LISTINGS, listings);
    notifyListeners();
    return updated;
  },

  verifyListing(id: string, adminName: string = 'System Admin'): ResidueListing | null {
    const updated = this.updateListing(id, { status: 'verified' });
    if (updated) {
      this.addAuditLog({
        adminId: 'admin-action',
        adminName,
        action: 'VERIFY_LISTING',
        entityType: 'listing',
        entityId: id,
        newValue: 'status: verified',
        reason: 'Administrative quality and location verification',
      });
    }
    return updated;
  },

  rejectListing(id: string, reason: string, adminName: string = 'System Admin'): ResidueListing | null {
    const updated = this.updateListing(id, { status: 'pending', notes: `Rejected: ${reason}` });
    if (updated) {
      this.addAuditLog({
        adminId: 'admin-action',
        adminName,
        action: 'REJECT_LISTING',
        entityType: 'listing',
        entityId: id,
        newValue: `Rejected: ${reason}`,
        reason,
      });
    }
    return updated;
  },

  // Buyer Demands
  getDemands(): BuyerDemand[] {
    return getFromStorage<BuyerDemand[]>(STORAGE_KEYS.DEMANDS, INITIAL_DEMANDS);
  },

  getDemandById(id: string): BuyerDemand | undefined {
    return this.getDemands().find((d) => d.id === id);
  },

  addDemand(data: {
    cropType: BuyerDemand['cropType'];
    requiredTonnes: number;
    maxDeliveredPricePerTonne: number;
    maxMoisturePercentage: number;
    deadlineDate: string;
    industryType: BuyerDemand['industryType'];
    address: string;
    district: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  }): BuyerDemand {
    const currentUser = this.getCurrentUser() || INITIAL_USERS[1];
    const newDemand: BuyerDemand = {
      id: `dem-${Date.now()}`,
      buyerId: currentUser.id,
      companyName: currentUser.organization || currentUser.name,
      contactPerson: currentUser.name,
      contactPhone: currentUser.phone,
      plantLocation: {
        address: data.address,
        district: data.district,
        state: data.state,
        coordinates: data.coordinates || { lat: 29.3909, lng: 76.9635 },
      },
      cropType: data.cropType,
      requiredTonnes: Number(data.requiredTonnes),
      fulfilledTonnes: 0,
      maxDeliveredPricePerTonne: Number(data.maxDeliveredPricePerTonne),
      maxMoisturePercentage: Number(data.maxMoisturePercentage),
      deadlineDate: data.deadlineDate,
      status: 'active',
      industryType: data.industryType,
      createdAt: new Date().toISOString(),
    };

    const demands = this.getDemands();
    demands.unshift(newDemand);
    setToStorage(STORAGE_KEYS.DEMANDS, demands);
    notifyListeners();
    return newDemand;
  },

  // Purchase Orders & Dispatch
  getOrders(): PurchaseOrder[] {
    return getFromStorage<PurchaseOrder[]>(
      STORAGE_KEYS.ORDERS,
      INITIAL_ORDERS
    );
  },

  getOrderById(id: string): PurchaseOrder | undefined {
    return this.getOrders().find((o) => o.id === id);
  },

  createOrderFromMatch(
    match: MatchResult,
    customQuantityTonnes?: number
  ): PurchaseOrder {
    const qty = customQuantityTonnes || Math.min(match.listing.recoverableTonnes, 30);
    const farmgateTotal = Math.round(qty * match.farmgatePricePerTonne);
    const freightTotal = Math.round(qty * match.estimatedFreightPerTonne);
    const deliveredTotal = farmgateTotal + freightTotal;
    const cropCoeff = CROP_COEFFICIENTS[match.listing.cropType];
    const co2Tonnes = Number(((qty * cropCoeff.co2AbatementTonnesPerTonne)).toFixed(1));

    const newOrder: PurchaseOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      listingId: match.listingId,
      demandId: match.demandId,
      buyerId: match.demand.buyerId,
      buyerName: match.demand.companyName,
      farmerId: match.listing.farmerId,
      farmerName: match.listing.farmerName,
      farmerPhone: match.listing.farmerPhone,
      logisticsPartnerId: 'user-logistics-1',
      logisticsPartnerName: 'Khalsa Agro Transport & Fleet Co.',
      cropType: match.listing.cropType,
      quantityTonnes: qty,
      farmgateRate: match.farmgatePricePerTonne,
      freightRate: match.estimatedFreightPerTonne,
      totalDeliveredRate: match.estimatedDeliveredPricePerTonne,
      farmerTotalPayout: farmgateTotal,
      logisticsTotalPayout: freightTotal,
      buyerTotalBill: deliveredTotal,
      pickupLocation: {
        village: match.listing.village,
        district: match.listing.district,
        state: match.listing.state,
        lat: match.listing.coordinates.lat,
        lng: match.listing.coordinates.lng,
      },
      deliveryLocation: {
        facility: `${match.demand.companyName} (${match.demand.plantLocation.district})`,
        district: match.demand.plantLocation.district,
        state: match.demand.plantLocation.state,
        lat: match.demand.plantLocation.coordinates.lat,
        lng: match.demand.plantLocation.coordinates.lng,
      },
      distanceKm: match.distanceKm,
      vehicleType: match.recommendedVehicle.name,
      status: 'accepted',
      trackingTimeline: [
        {
          step: 'Order Confirmed & Escrow Allocated',
          timestamp: new Date().toLocaleDateString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          completed: true,
          notes: 'Purchase order signed. Escrow fund secured.',
        },
        {
          step: 'Vehicle Dispatched to Farmgate',
          timestamp: 'Scheduled Today',
          completed: false,
          notes: `Assigned: ${match.recommendedVehicle.name}`,
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
      ],
      co2SavedTonnes: co2Tonnes,
      createdAt: new Date().toISOString(),
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    setToStorage(STORAGE_KEYS.ORDERS, orders);

    // Update listing status to 'matched'
    this.updateListingStatus(match.listingId, 'matched');

    // Update demand fulfilled quantity
    const demands = this.getDemands().map((d) => {
      if (d.id === match.demandId) {
        const newFulfilled = d.fulfilledTonnes + qty;
        return {
          ...d,
          fulfilledTonnes: newFulfilled,
          status: newFulfilled >= d.requiredTonnes ? ('fulfilled' as const) : ('partially_fulfilled' as const),
        };
      }
      return d;
    });
    setToStorage(STORAGE_KEYS.DEMANDS, demands);

    notifyListeners();
    return newOrder;
  },

  updateOrderStatus(orderId: string, newStatus: OrderStatus, notes?: string) {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        const timeline = [...o.trackingTimeline];
        const nowStr = new Date().toLocaleDateString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        });

        if (newStatus === 'logistics_assigned' && timeline[1]) {
          timeline[1].completed = true;
          timeline[1].timestamp = nowStr;
          if (notes) timeline[1].notes = notes;
        } else if (newStatus === 'pickup_en_route' && timeline[1]) {
          timeline[1].completed = true;
          timeline[1].timestamp = nowStr;
          if (notes) timeline[1].notes = notes;
        } else if (newStatus === 'loaded_and_weighed' && timeline[2]) {
          timeline[2].completed = true;
          timeline[2].timestamp = nowStr;
          if (notes) timeline[2].notes = notes;
        } else if (newStatus === 'in_transit' && timeline[3]) {
          timeline[3].completed = true;
          timeline[3].timestamp = nowStr;
          if (notes) timeline[3].notes = notes;
        } else if (newStatus === 'delivered' && timeline[4]) {
          timeline[4].completed = true;
          timeline[4].timestamp = nowStr;
          if (notes) timeline[4].notes = notes;
        } else if (newStatus === 'settled' && timeline[5]) {
          timeline[4].completed = true;
          timeline[5].completed = true;
          timeline[5].timestamp = nowStr;
          if (notes) timeline[5].notes = notes;
        }

        return {
          ...o,
          status: newStatus,
          trackingTimeline: timeline,
        };
      }
      return o;
    });

    setToStorage(STORAGE_KEYS.ORDERS, orders);
    notifyListeners();
  },

  acceptPurchaseRequest(orderId: string) {
    this.updateOrderStatus(orderId, 'accepted', 'Farmer confirmed residue availability and accepted purchase request.');
  },

  rejectPurchaseRequest(orderId: string, reason: string = 'Residue unavailable or price mismatch') {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'cancelled' as OrderStatus,
          cancelledReason: `Rejected by Farmer: ${reason}`,
        };
      }
      return o;
    });
    setToStorage(STORAGE_KEYS.ORDERS, orders);
    notifyListeners();
  },

  cancelOrder(orderId: string, reason: string, adminName: string = 'System Admin') {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'cancelled' as OrderStatus,
          cancelledReason: reason,
        };
      }
      return o;
    });
    setToStorage(STORAGE_KEYS.ORDERS, orders);

    this.addAuditLog({
      adminId: 'admin-action',
      adminName,
      action: 'CANCEL_ORDER',
      entityType: 'order',
      entityId: orderId,
      newValue: `cancelled: ${reason}`,
      reason,
    });

    notifyListeners();
  },

  assignLogisticsToOrder(orderId: string, logisticsId: string, logisticsName: string, adminName: string = 'System Admin') {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          logisticsPartnerId: logisticsId,
          logisticsPartnerName: logisticsName,
          status: 'logistics_assigned' as OrderStatus,
        };
      }
      return o;
    });
    setToStorage(STORAGE_KEYS.ORDERS, orders);

    this.addAuditLog({
      adminId: 'admin-action',
      adminName,
      action: 'ASSIGN_LOGISTICS',
      entityType: 'order',
      entityId: orderId,
      newValue: `Assigned to: ${logisticsName} (${logisticsId})`,
      reason: 'Capacity allocation & vehicle routing',
    });

    notifyListeners();
  },

  resolveDispute(orderId: string, resolutionNotes: string, adjustment: number = 0, adminName: string = 'System Admin') {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          disputeStatus: 'resolved' as const,
          disputeNotes: resolutionNotes,
          adjustments: adjustment,
        };
      }
      return o;
    });
    setToStorage(STORAGE_KEYS.ORDERS, orders);

    this.addAuditLog({
      adminId: 'admin-action',
      adminName,
      action: 'RESOLVE_DISPUTE',
      entityType: 'order',
      entityId: orderId,
      newValue: `Resolved: ${resolutionNotes}, Adjustment: ₹${adjustment}`,
      reason: resolutionNotes,
    });

    notifyListeners();
  },

  uploadDeliveryProof(orderId: string, proofUrl: string, note: string = 'Certified weighbridge slip uploaded') {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          deliveryProofUrl: proofUrl,
          deliveryProofNote: note,
          status: 'delivered' as OrderStatus,
        };
      }
      return o;
    });
    setToStorage(STORAGE_KEYS.ORDERS, orders);
    notifyListeners();
  },

  // Audit Logs
  getAuditLogs(): AdminAuditLog[] {
    return getFromStorage<AdminAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  addAuditLog(entry: Omit<AdminAuditLog, 'id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newLog: AdminAuditLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setToStorage(STORAGE_KEYS.AUDIT_LOGS, logs);
    notifyListeners();
    return newLog;
  },

  // Platform Settings
  getPlatformSettings(): PlatformSettings {
    return getFromStorage<PlatformSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  updatePlatformSettings(newSettings: Partial<PlatformSettings>, adminName: string = 'System Admin') {
    const current = this.getPlatformSettings();
    const updated = { ...current, ...newSettings };
    setToStorage(STORAGE_KEYS.SETTINGS, updated);

    this.addAuditLog({
      adminId: 'admin-action',
      adminName,
      action: 'UPDATE_PLATFORM_SETTINGS',
      entityType: 'settings',
      entityId: 'global',
      previousValue: JSON.stringify(current),
      newValue: JSON.stringify(updated),
      reason: 'Administrative policy parameter update',
    });

    notifyListeners();
    return updated;
  },

  // Platform Aggregate Analytics
  getPlatformStats() {
    const listings = this.getListings();
    const demands = this.getDemands();
    const orders = this.getOrders();
    const users = this.getAllUsers();

    const totalListedTonnes = listings.reduce((sum, l) => sum + l.recoverableTonnes, 0);
    const totalDemandedTonnes = demands.reduce((sum, d) => sum + d.requiredTonnes, 0);
    const totalOrderedTonnes = orders.reduce((sum, o) => sum + o.quantityTonnes, 0);

    const totalSoldTonnes = orders
      .filter((o) => o.status === 'delivered' || o.status === 'settled')
      .reduce((sum, o) => sum + o.quantityTonnes, 0);

    const totalFarmerPayouts = orders.reduce((sum, o) => sum + o.farmerTotalPayout, 0);
    const totalLogisticsPayouts = orders.reduce((sum, o) => sum + o.logisticsTotalPayout, 0);
    const totalBuyerSpend = orders.reduce((sum, o) => sum + o.buyerTotalBill, 0);
    const totalTransactionValue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.buyerTotalBill : 0), 0);
    const totalCO2PreventedTonnes = orders.reduce((sum, o) => sum + o.co2SavedTonnes, 0) + 1850;

    const activeOrders = orders.filter((o) => o.status !== 'settled' && o.status !== 'cancelled').length;
    const pendingOrders = orders.filter((o) => o.status === 'requested' || o.status === 'accepted').length;
    const completedOrders = orders.filter((o) => o.status === 'settled' || o.status === 'delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;

    return {
      totalUsers: users.length,
      farmersCount: users.filter((u) => u.role === 'farmer').length,
      buyersCount: users.filter((u) => u.role === 'buyer').length,
      logisticsCount: users.filter((u) => u.role === 'logistics').length,
      adminCount: users.filter((u) => u.role === 'admin').length,
      totalListedTonnes: Math.round(totalListedTonnes),
      totalDemandedTonnes: Math.round(totalDemandedTonnes),
      totalOrderedTonnes: Math.round(totalOrderedTonnes),
      totalSoldTonnes: Math.round(totalSoldTonnes),
      totalFarmerPayouts,
      totalLogisticsPayouts,
      totalBuyerSpend,
      totalTransactionValue,
      totalCO2PreventedTonnes: Math.round(totalCO2PreventedTonnes),
      activeOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      activeListingsCount: listings.filter((l) => l.status !== 'sold').length,
    };
  },

  // Reset store to initial seed data
  resetToDefaults() {
    setToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    setToStorage(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    setToStorage(STORAGE_KEYS.LISTINGS, INITIAL_LISTINGS);
    setToStorage(STORAGE_KEYS.DEMANDS, INITIAL_DEMANDS);
    setToStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    setToStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setToStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    notifyListeners();
  },
};
