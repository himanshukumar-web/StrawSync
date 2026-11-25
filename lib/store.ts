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
  EscrowTransaction,
  WeightUnit,
  LandAreaUnit,
  ListingCategory,
  PaymentMethod,
  CalculatorEstimate,
  SavedCalculation,
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
  TRANSACTIONS: 'strawsync_transactions',
  CALCULATOR_ESTIMATE: 'strawsync_calculator_estimate',
  CALCULATOR_PREFILL: 'strawsync_calculator_prefill',
  SAVED_CALCULATIONS: 'strawsync_saved_calculations',
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
let storageListenerBound = false;

function ensureCrossTabSync() {
  if (typeof window === 'undefined' || storageListenerBound) return;
  storageListenerBound = true;
  window.addEventListener('storage', (event) => {
    if (!event.key || event.key.startsWith('strawsync_')) {
      notifyListeners();
    }
  });
}

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

const DEMO_DEFAULT_PASSWORD = 'Demo@1234';

export type AuthResult =
  | { success: true; user: UserProfile }
  | { success: false; error: string };

/**
 * Normalizes emails (lowercase trimmed) and Indian mobile numbers (strips +91 / leading 91 / formatting to 10-digit key).
 */
export function normalizeIdentifier(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Weight unit conversion helpers between Kg, Quintal (100 kg), and Metric Tonne (1000 kg).
 */
export function toTonnes(quantity: number, unit: WeightUnit = 'tonne'): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  if (unit === 'kg') return Number((safeQty / 1000).toFixed(3));
  if (unit === 'quintal') return Number((safeQty / 10).toFixed(2));
  return Number(safeQty.toFixed(2));
}

export function fromTonnes(tonnes: number, unit: WeightUnit = 'tonne'): number {
  const safeTonnes = Math.max(0, Number(tonnes) || 0);
  if (unit === 'kg') return Math.round(safeTonnes * 1000);
  if (unit === 'quintal') return Number((safeTonnes * 10).toFixed(1));
  return Number(safeTonnes.toFixed(2));
}

export function pricePerUnitToPerTonne(pricePerUnit: number, unit: WeightUnit = 'tonne'): number {
  const safePrice = Math.max(0, Number(pricePerUnit) || 0);
  if (unit === 'kg') return Math.round(safePrice * 1000);
  if (unit === 'quintal') return Math.round(safePrice * 10);
  return Math.round(safePrice);
}

export function formatWeight(quantity: number, unit: WeightUnit = 'tonne'): string {
  const safe = Number(quantity) || 0;
  if (unit === 'kg') return `${safe.toLocaleString('en-IN')} Kg`;
  if (unit === 'quintal') return `${safe.toLocaleString('en-IN')} ${safe === 1 ? 'Quintal' : 'Quintals'}`;
  return `${safe.toLocaleString('en-IN')} ${safe === 1 ? 'Tonne' : 'Tonnes'}`;
}

export function formatUnitPrice(pricePerUnit: number, unit: WeightUnit = 'tonne'): string {
  const safe = Math.round(Number(pricePerUnit) || 0);
  const suffix = unit === 'tonne' ? 't' : unit;
  return `₹${safe.toLocaleString('en-IN')}/${suffix}`;
}

export const LAND_AREA_MULTIPLIERS_TO_ACRE: Record<LandAreaUnit, number> = {
  acre: 1,
  bigha: 0.625,
  hectare: 2.47105,
  kanal: 0.125,
  guntha: 0.025,
};

export function toAcres(value: number, unit: LandAreaUnit = 'acre'): number {
  const safe = Math.max(0, Number(value) || 0);
  return Number((safe * (LAND_AREA_MULTIPLIERS_TO_ACRE[unit] ?? 1)).toFixed(5));
}

export function canBuyerPayOrder(order: PurchaseOrder): boolean {
  if (order.paymentStatus === 'settled' || order.status === 'settled') return false;
  return [
    'logistics_assigned',
    'pickup_en_route',
    'loaded_and_weighed',
    'in_transit',
    'delivered',
  ].includes(order.status);
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

export const StrawSyncStore = {
  // Subscribe to changes (same-tab and cross-tab via storage events)
  subscribe(listener: Listener) {
    ensureCrossTabSync();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // Users & Auth
  getCurrentUser(): UserProfile | null {
    return getFromStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
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

  login(identifier: string, role: UserRole, password: string = ''): AuthResult {
    const normId = normalizeIdentifier(identifier);
    const cleanPassword = password.trim();

    if (!normId) {
      return { success: false, error: 'Please enter your registered mobile number or email.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    const users = this.getAllUsers();
    const matched = users.find((u) => {
      if (u.role !== role) return false;
      const phoneKey = normalizeIdentifier(u.phone);
      const emailKey = normalizeIdentifier(u.email);
      return (Boolean(phoneKey) && phoneKey === normId) || (Boolean(emailKey) && emailKey === normId);
    });

    if (!matched) {
      return {
        success: false,
        error: 'No account found with this phone/email for the selected role. Please register first.',
      };
    }

    if (matched.status === 'suspended') {
      return {
        success: false,
        error: 'This account has been suspended. Contact an administrator.',
      };
    }

    const expectedPassword = matched.password?.trim() || DEMO_DEFAULT_PASSWORD;
    if (expectedPassword !== cleanPassword) {
      return {
        success: false,
        error: 'Incorrect password. Please try again.',
      };
    }

    this.setCurrentUser(matched);
    return { success: true, user: matched };
  },

  hasRoleAccess(requiredRole: UserRole): boolean {
    const current = this.getCurrentUser();
    if (!current) return false;
    if (current.role === 'admin') return true; // Admin has oversight access
    return current.role === requiredRole;
  },

  switchRole(role: UserRole) {
    const users = this.getAllUsers();
    const found = users.find((u) => u.role === role);
    if (found) {
      this.setCurrentUser(found);
    }
  },

  getAllUsers(): UserProfile[] {
    const stored = getFromStorage<UserProfile[]>(STORAGE_KEYS.USERS, []);
    const merged: UserProfile[] = [];
    const seen = new Set<string>();

    for (const user of stored) {
      seen.add(user.id);
      merged.push(user);
    }
    for (const seed of INITIAL_USERS) {
      if (!seen.has(seed.id)) {
        merged.push(seed);
      }
    }
    return merged;
  },

  register(profileData: Omit<UserProfile, 'id' | 'isVerified'>): AuthResult {
    const users = this.getAllUsers();
    // Admin cannot be registered publicly - enforce safety
    const safeRole: UserRole = profileData.role === 'admin' ? 'farmer' : profileData.role;

    const normPhone = normalizeIdentifier(profileData.phone);
    const normEmail = normalizeIdentifier(profileData.email);
    const cleanPassword = (profileData.password || '').trim();

    if (!profileData.name.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!normPhone && !normEmail) {
      return { success: false, error: 'Please enter a mobile number or email address.' };
    }
    if (cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const duplicate = users.find((u) => {
      const existingPhone = normalizeIdentifier(u.phone);
      const existingEmail = normalizeIdentifier(u.email);
      return (
        (Boolean(normPhone) && Boolean(existingPhone) && existingPhone === normPhone) ||
        (Boolean(normEmail) && Boolean(existingEmail) && existingEmail === normEmail)
      );
    });

    if (duplicate) {
      return {
        success: false,
        error: 'An account with this phone number or email already exists.',
      };
    }

    const newUser: UserProfile = {
      ...profileData,
      name: profileData.name.trim(),
      phone: normPhone,
      email: normEmail,
      location: profileData.location.trim(),
      password: cleanPassword,
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
    return { success: true, user: newUser };
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

  updatePayoutDetails(
    userId: string,
    details: {
      upiId?: string;
      bankAccountNumber?: string;
      ifscCode?: string;
      bankHolderName?: string;
    }
  ): AuthResult {
    const current = this.getCurrentUser();
    if (!current || current.id !== userId) {
      return {
        success: false,
        error: 'Unauthorized: only the logged-in farmer can update their own payout details.',
      };
    }

    const upi = details.upiId?.trim() || '';
    const bankAcc = details.bankAccountNumber?.trim() || '';
    const ifsc = details.ifscCode?.trim().toUpperCase() || '';
    const holder = details.bankHolderName?.trim() || current.name;

    if (!upi && !(bankAcc && ifsc)) {
      return {
        success: false,
        error: 'Please enter a valid UPI ID or Bank Account Number with IFSC code.',
      };
    }

    const users = this.getAllUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'User profile not found.' };
    }

    const updated: UserProfile = {
      ...users[index],
      upiId: upi || undefined,
      bankAccountNumber: bankAcc || undefined,
      ifscCode: ifsc || undefined,
      bankHolderName: holder || undefined,
    };
    users[index] = updated;
    setToStorage(STORAGE_KEYS.USERS, users);
    this.setCurrentUser(updated);
    return { success: true, user: updated };
  },

  changeUserRole(id: string, newRole: UserRole, adminName: string = 'System Admin'): UserProfile | null {
    return this.updateUser(id, { role: newRole }, adminName);
  },

  requestPasswordReset(identifier: string): { success: boolean; message: string; resetToken?: string } {
    const normId = normalizeIdentifier(identifier);
    const users = this.getAllUsers();
    const user = users.find(
      (u) =>
        (Boolean(normId) && (normalizeIdentifier(u.email) === normId || normalizeIdentifier(u.phone) === normId))
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
      message: `Password reset verification token generated for ${user.email || user.phone}. Use the token below to update credentials.`,
      resetToken: token,
    };
  },

  resetPassword(identifier: string, newPassword: string): boolean {
    const normId = normalizeIdentifier(identifier);
    const users = this.getAllUsers();
    const index = users.findIndex(
      (u) =>
        u.id === identifier ||
        (Boolean(normId) && (normalizeIdentifier(u.email) === normId || normalizeIdentifier(u.phone) === normId))
    );

    if (index === -1) return false;
    users[index].password = newPassword.trim();
    setToStorage(STORAGE_KEYS.USERS, users);
    notifyListeners();
    return true;
  },

  // Residue & Produce Listings
  getListings(): ResidueListing[] {
    return getFromStorage<ResidueListing[]>(
      STORAGE_KEYS.LISTINGS,
      INITIAL_LISTINGS
    ).map((l) => {
      const weightUnit: WeightUnit = l.weightUnit || 'tonne';
      const coeff = CROP_COEFFICIENTS[l.cropType] || CROP_COEFFICIENTS.paddy;
      return {
        ...l,
        weightUnit,
        originalQuantity:
          l.originalQuantity !== undefined ? l.originalQuantity : fromTonnes(l.recoverableTonnes, weightUnit),
        pricePerUnit:
          l.pricePerUnit !== undefined
            ? l.pricePerUnit
            : weightUnit === 'kg'
              ? Math.round(l.expectedPricePerTonne / 1000)
              : weightUnit === 'quintal'
                ? Math.round(l.expectedPricePerTonne / 10)
                : l.expectedPricePerTonne,
        category: l.category || coeff.category,
      };
    });
  },

  getListingById(id: string): ResidueListing | undefined {
    return this.getListings().find((l) => l.id === id);
  },

  addListing(data: {
    cropType: ResidueListing['cropType'];
    landAreaAcres?: number;
    landAreaUnit?: LandAreaUnit;
    originalLandArea?: number;
    expectedPricePerTonne?: number;
    directQuantity?: number;
    weightUnit?: WeightUnit;
    pricePerUnit?: number;
    imageUrl?: string;
    category?: ListingCategory;
    customCropName?: string;
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
    const coeff = CROP_COEFFICIENTS[data.cropType] || CROP_COEFFICIENTS.paddy;
    const unit: WeightUnit = data.weightUnit || 'tonne';
    const acres = Math.max(0, Number(data.landAreaAcres || 0));
    const estimates = estimateResidue(data.cropType, acres, data.baleType);

    const recoverableTonnes =
      data.directQuantity !== undefined && data.directQuantity > 0
        ? toTonnes(data.directQuantity, unit)
        : estimates.recoverableTonnes;

    const originalQuantity =
      data.directQuantity !== undefined && data.directQuantity > 0
        ? Number(data.directQuantity)
        : fromTonnes(recoverableTonnes, unit);

    const pricePerUnit =
      data.pricePerUnit !== undefined
        ? Number(data.pricePerUnit)
        : Number(data.expectedPricePerTonne || 0);

    const expectedPricePerTonne =
      data.expectedPricePerTonne !== undefined && data.pricePerUnit === undefined
        ? Number(data.expectedPricePerTonne)
        : pricePerUnitToPerTonne(pricePerUnit, unit);

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
      cropName: data.customCropName?.trim() || coeff.cropName,
      category: data.category || coeff.category,
      landAreaAcres: acres,
      landAreaUnit: data.landAreaUnit || 'acre',
      originalLandArea: data.originalLandArea ?? acres,
      estimatedGrossTonnes:
        acres > 0 ? estimates.grossTonnes : Number((recoverableTonnes * 1.1).toFixed(2)),
      recoverableTonnes,
      originalQuantity,
      weightUnit: unit,
      pricePerUnit,
      imageUrl: data.imageUrl || undefined,
      moisturePercentage:
        data.moisturePercentage !== undefined ? data.moisturePercentage : coeff.typicalMoisturePercent,
      baleType: data.baleType,
      expectedPricePerTonne,
      harvestDate: data.harvestDate,
      collectionStartDate: data.collectionStartDate,
      collectionEndDate: data.collectionEndDate,
      qualityScore:
        (data.moisturePercentage ?? coeff.typicalMoisturePercent) <= 18 ? 'A' : 'B',
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
    return getFromStorage<BuyerDemand[]>(STORAGE_KEYS.DEMANDS, INITIAL_DEMANDS).map((d) => {
      const fulfilledTonnes = Math.min(d.requiredTonnes, Math.max(0, d.fulfilledTonnes));
      const status =
        d.status === 'cancelled'
          ? 'cancelled'
          : fulfilledTonnes >= d.requiredTonnes
            ? ('fulfilled' as const)
            : d.status;
      return {
        ...d,
        fulfilledTonnes,
        status,
      };
    });
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
    ).map((o) => {
      const pickupCoords: [number, number] = o.pickupCoords || [
        o.pickupLocation?.lat || 30.3742,
        o.pickupLocation?.lng || 75.8712,
      ];
      const dropCoords: [number, number] = o.dropCoords || [
        o.deliveryLocation?.lat || 29.3909,
        o.deliveryLocation?.lng || 76.9635,
      ];
      const gpsProgressPercent =
        o.gpsProgressPercent !== undefined ? o.gpsProgressPercent : defaultProgressForStatus(o.status);
      const currentTruckCoords: [number, number] =
        o.currentTruckCoords || interpolateCoords(pickupCoords, dropCoords, gpsProgressPercent);

      return {
        ...o,
        weightUnit: o.weightUnit || 'tonne',
        displayQuantity: o.displayQuantity ?? o.quantityTonnes,
        pickupCoords,
        dropCoords,
        gpsProgressPercent,
        currentTruckCoords,
        vehicleNumber: o.vehicleNumber || 'HR-05-BL-4891',
        paymentStatus:
          o.paymentStatus ||
          (o.status === 'settled'
            ? 'settled'
            : o.status === 'requested' || o.status === 'accepted'
              ? 'awaiting_logistics'
              : 'pending_release'),
      };
    });
  },

  getOrderById(id: string): PurchaseOrder | undefined {
    return this.getOrders().find((o) => o.id === id);
  },

  createOrderFromMatch(
    match: MatchResult,
    customQuantityTonnes?: number,
    displayMeta?: { weightUnit?: WeightUnit; displayQuantity?: number },
    escrowMeta?: { paymentMethod?: PaymentMethod; utrNumber?: string; paymentReference?: string }
  ): PurchaseOrder {
    const activeUser = this.getCurrentUser();
    const actingBuyer = activeUser?.role === 'buyer' ? activeUser : null;
    const requestedQty = customQuantityTonnes || Math.min(match.listing.recoverableTonnes, 30);
    const qty = Math.max(0.01, Number(Math.min(requestedQty, match.listing.recoverableTonnes).toFixed(3)));
    const farmgateTotal = Math.round(qty * match.farmgatePricePerTonne);
    const freightTotal = Math.round(qty * match.estimatedFreightPerTonne);
    const deliveredTotal = farmgateTotal + freightTotal;
    const cropCoeff = CROP_COEFFICIENTS[match.listing.cropType] || CROP_COEFFICIENTS.paddy;
    const co2Tonnes = Number(((qty * cropCoeff.co2AbatementTonnesPerTonne)).toFixed(2));
    const unit: WeightUnit = displayMeta?.weightUnit || match.listing.weightUnit || 'tonne';
    const displayQty = displayMeta?.displayQuantity ?? fromTonnes(qty, unit);
    const pickupCoords: [number, number] = [match.listing.coordinates.lat, match.listing.coordinates.lng];
    const dropCoords: [number, number] = [
      match.demand.plantLocation.coordinates.lat,
      match.demand.plantLocation.coordinates.lng,
    ];
    const nowIso = new Date().toISOString();

    const newOrder: PurchaseOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      listingId: match.listingId,
      demandId: match.demandId,
      buyerId: actingBuyer ? actingBuyer.id : match.demand.buyerId,
      buyerName: actingBuyer ? (actingBuyer.organization || actingBuyer.name) : match.demand.companyName,
      farmerId: match.listing.farmerId,
      farmerName: match.listing.farmerName,
      farmerPhone: match.listing.farmerPhone,
      cropType: match.listing.cropType,
      quantityTonnes: qty,
      weightUnit: unit,
      displayQuantity: displayQty,
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
        lat: pickupCoords[0],
        lng: pickupCoords[1],
      },
      deliveryLocation: {
        facility: `${actingBuyer ? (actingBuyer.organization || actingBuyer.name) : match.demand.companyName} (${match.demand.plantLocation.district})`,
        district: match.demand.plantLocation.district,
        state: match.demand.plantLocation.state,
        lat: dropCoords[0],
        lng: dropCoords[1],
      },
      pickupCoords,
      dropCoords,
      currentTruckCoords: pickupCoords,
      gpsProgressPercent: 0,
      vehicleNumber: 'PB-13-TR-4421',
      driverName: 'Sukhdev Singh',
      distanceKm: match.distanceKm,
      vehicleType: match.recommendedVehicle.name,
      status: 'requested',
      paymentStatus: escrowMeta?.utrNumber ? 'escrow_funded' : 'awaiting_logistics',
      paymentMethod: escrowMeta?.paymentMethod,
      escrowPaymentReference: escrowMeta?.paymentReference,
      utrNumber: escrowMeta?.utrNumber,
      escrowFundedAt: escrowMeta?.utrNumber ? nowIso : undefined,
      trackingTimeline: [
        {
          step: 'Purchase Request Submitted by Buyer',
          timestamp: new Date().toLocaleDateString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          completed: true,
          notes: escrowMeta?.utrNumber
            ? `Escrow funded via ${escrowMeta.paymentMethod} (UTR: ${escrowMeta.utrNumber}). Awaiting ${match.listing.farmerName}.`
            : `Awaiting confirmation from ${match.listing.farmerName}.`,
        },
        {
          step: 'Farmer Confirmation & Vehicle Dispatch',
          timestamp: 'Pending Farmer Approval',
          completed: false,
          notes: `Assigned vehicle class: ${match.recommendedVehicle.name}`,
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
      createdAt: nowIso,
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);
    setToStorage(STORAGE_KEYS.ORDERS, orders);

    // Update demand fulfilled quantity conservatively
    const demands = this.getDemands().map((d) => {
      if (d.id === match.demandId) {
        const newFulfilled = Math.min(d.requiredTonnes, Math.max(0, d.fulfilledTonnes + qty));
        return {
          ...d,
          fulfilledTonnes: newFulfilled,
          status: newFulfilled >= d.requiredTonnes ? ('fulfilled' as const) : ('partially_fulfilled' as const),
        };
      }
      return d;
    });
    setToStorage(STORAGE_KEYS.DEMANDS, demands);

    this.addNotification({
      userId: match.listing.farmerId,
      title: escrowMeta?.utrNumber
        ? `New Paid Escrow Request #${newOrder.orderNumber}`
        : `New Purchase Request #${newOrder.orderNumber}`,
      message: escrowMeta?.utrNumber
        ? `New Paid Escrow Purchase Request received from ${newOrder.buyerName} for ${formatWeight(displayQty, unit)} of ${match.listing.cropName} (₹${farmgateTotal.toLocaleString('en-IN')} locked • ${escrowMeta.paymentMethod} • UTR ${escrowMeta.utrNumber}).`
        : `${newOrder.buyerName} requested ${formatWeight(displayQty, unit)} of ${match.listing.cropName} (₹${farmgateTotal.toLocaleString('en-IN')}).`,
      type: 'order',
      orderId: newOrder.id,
    });

    notifyListeners();
    return newOrder;
  },

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
    logisticsPartner?: { id: string; name: string }
  ) {
    const orders = this.getOrders().map((o) => {
      if (o.id === orderId) {
        const timeline = [...o.trackingTimeline];
        const nowIso = new Date().toISOString();
        const nowStr = new Date(nowIso).toLocaleDateString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        });

        if (newStatus === 'accepted' && timeline[1]) {
          timeline[1].timestamp = 'Awaiting Logistics';
          if (notes) timeline[1].notes = notes;
        } else if (newStatus === 'logistics_assigned' && timeline[1]) {
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

        const pickup: [number, number] = o.pickupCoords || [o.pickupLocation.lat, o.pickupLocation.lng];
        const drop: [number, number] = o.dropCoords || [o.deliveryLocation.lat, o.deliveryLocation.lng];
        const targetPct = Math.max(o.gpsProgressPercent || 0, defaultProgressForStatus(newStatus));
        const nextCoords = interpolateCoords(pickup, drop, targetPct);

        return {
          ...o,
          status: newStatus,
          logisticsPartnerId: logisticsPartner ? logisticsPartner.id : o.logisticsPartnerId,
          logisticsPartnerName: logisticsPartner ? logisticsPartner.name : o.logisticsPartnerName,
          pickupCoords: pickup,
          dropCoords: drop,
          gpsProgressPercent: targetPct,
          currentTruckCoords: nextCoords,
          lastGpsUpdatedAt: targetPct > 0 ? nowIso : o.lastGpsUpdatedAt,
          trackingTimeline: timeline,
        };
      }
      return o;
    });

    setToStorage(STORAGE_KEYS.ORDERS, orders);
    notifyListeners();
  },

  broadcastTruckGps(
    orderId: string,
    options?: {
      advancePercent?: number;
      coords?: [number, number];
      vehicleNumber?: string;
      driverName?: string;
    }
  ): { success: true; order: PurchaseOrder } | { success: false; error: string } {
    const current = this.getCurrentUser();
    const existing = this.getOrderById(orderId);
    if (!existing) {
      return { success: false, error: 'Order not found.' };
    }

    const isAuthorized =
      current?.role === 'admin' ||
      (current?.role === 'logistics' &&
        (!existing.logisticsPartnerId || existing.logisticsPartnerId === current.id));

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Unauthorized: only the assigned logistics partner or admin can broadcast GPS updates.',
      };
    }

    const pickup: [number, number] = existing.pickupCoords || [
      existing.pickupLocation.lat,
      existing.pickupLocation.lng,
    ];
    const drop: [number, number] = existing.dropCoords || [
      existing.deliveryLocation.lat,
      existing.deliveryLocation.lng,
    ];

    const stepAdvance = options?.advancePercent ?? 25;
    const currentPercent = existing.gpsProgressPercent || 0;
    const nextPercent = options?.coords
      ? Math.min(95, Math.max(10, currentPercent + 10))
      : Math.min(100, Math.max(0, currentPercent + stepAdvance));

    const nextCoords: [number, number] = options?.coords
      ? [Number(options.coords[0].toFixed(5)), Number(options.coords[1].toFixed(5))]
      : interpolateCoords(pickup, drop, nextPercent);

    const nowIso = new Date().toISOString();
    let updatedOrder: PurchaseOrder | null = null;
    const orders = this.getOrders().map((o) => {
      if (o.id !== orderId) return o;
      updatedOrder = {
        ...o,
        logisticsPartnerId:
          o.logisticsPartnerId || (current?.role === 'logistics' ? current.id : o.logisticsPartnerId),
        logisticsPartnerName:
          o.logisticsPartnerName ||
          (current?.role === 'logistics' ? current.organization || current.name : o.logisticsPartnerName),
        pickupCoords: pickup,
        dropCoords: drop,
        currentTruckCoords: nextCoords,
        gpsProgressPercent: nextPercent,
        lastGpsUpdatedAt: nowIso,
        vehicleNumber: options?.vehicleNumber?.trim() || o.vehicleNumber || 'HR-05-BL-4891',
        driverName: options?.driverName?.trim() || o.driverName || 'Sukhdev Singh',
      };
      return updatedOrder;
    });

    if (!updatedOrder) {
      return { success: false, error: 'Failed to update GPS coordinates.' };
    }

    setToStorage(STORAGE_KEYS.ORDERS, orders);
    notifyListeners();
    return { success: true, order: updatedOrder };
  },

  acceptPurchaseRequest(orderId: string) {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== 'requested') return;

    const listing = this.getListingById(order.listingId);
    if (listing) {
      const remainingTonnes = Math.max(0, Number((listing.recoverableTonnes - order.quantityTonnes).toFixed(3)));
      const unit: WeightUnit = listing.weightUnit || 'tonne';
      this.updateListing(listing.id, {
        recoverableTonnes: remainingTonnes,
        originalQuantity: fromTonnes(remainingTonnes, unit),
        status: remainingTonnes <= 0 ? 'sold' : 'matched',
      });
    }

    this.updateOrderStatus(
      orderId,
      'accepted',
      'Farmer confirmed residue availability and accepted purchase request. Ready for logistics dispatch.'
    );

    this.addNotification({
      userId: order.buyerId,
      title: `Request Accepted (#${order.orderNumber})`,
      message: `${order.farmerName} accepted your request for ${order.quantityTonnes}t ${order.cropType.toUpperCase()}.`,
      type: 'success',
    });
  },

  rejectPurchaseRequest(orderId: string, reason: string = 'Residue unavailable or price mismatch') {
    const existing = this.getOrderById(orderId);
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

    if (existing) {
      // Restore demand remaining quantity and listing availability on rejection
      const demands = this.getDemands().map((d) => {
        if (d.id === existing.demandId) {
          const nextFulfilled = Math.max(0, Number((d.fulfilledTonnes - existing.quantityTonnes).toFixed(1)));
          return {
            ...d,
            fulfilledTonnes: nextFulfilled,
            status: nextFulfilled > 0 ? ('partially_fulfilled' as const) : ('active' as const),
          };
        }
        return d;
      });
      setToStorage(STORAGE_KEYS.DEMANDS, demands);

      const listing = this.getListingById(existing.listingId);
      if (listing && listing.status !== 'sold' && listing.recoverableTonnes > 0) {
        this.updateListingStatus(listing.id, 'verified');
      }

      this.addNotification({
        userId: existing.buyerId,
        title: `Request Declined (#${existing.orderNumber})`,
        message: `${existing.farmerName} declined your request: ${reason}`,
        type: 'warning',
      });
    }

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

  markOrderDelivered(
    orderId: string,
    details?: {
      slipId?: string;
      netTonnes?: number;
      proofUrl?: string;
      notes?: string;
    }
  ): { success: true; order: PurchaseOrder } | { success: false; error: string } {
    const current = this.getCurrentUser();
    const order = this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const isAuthorizedLogistics =
      current?.role === 'admin' ||
      (current?.role === 'logistics' &&
        (!order.logisticsPartnerId || order.logisticsPartnerId === current.id));

    if (!isAuthorizedLogistics) {
      return {
        success: false,
        error: 'Unauthorized: only the assigned logistics partner or admin can mark delivery.',
      };
    }

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date(nowIso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const slipId = details?.slipId?.trim() || order.weighbridgeSlipId || `WB-${order.orderNumber.slice(-4)}`;
    const netTonnes = Number(details?.netTonnes || order.weighbridgeNetTonnes || order.quantityTonnes);
    const noteText =
      details?.notes ||
      `Gate Entry Complete. Certified Weighbridge Slip #${slipId} (${netTonnes}t).`;

    let updatedOrder: PurchaseOrder | null = null;
    const orders = this.getOrders().map((o) => {
      if (o.id !== orderId) return o;
      const timeline = o.trackingTimeline.map((step, idx) => {
        if (idx <= 4) {
          return {
            ...step,
            completed: true,
            timestamp: idx === 4 || !step.completed ? nowDisplay : step.timestamp,
            notes: idx === 4 ? noteText : step.notes,
          };
        }
        return step;
      });
      const pickup: [number, number] = o.pickupCoords || [
        o.pickupLocation.lat,
        o.pickupLocation.lng,
      ];
      const drop: [number, number] = o.dropCoords || [
        o.deliveryLocation.lat,
        o.deliveryLocation.lng,
      ];
      updatedOrder = {
        ...o,
        status: o.paymentStatus === 'settled' ? 'settled' : 'delivered',
        paymentStatus: o.paymentStatus === 'settled' ? 'settled' : 'pending_release',
        deliveredAt: nowIso,
        weighbridgeSlipId: slipId,
        weighbridgeNetTonnes: netTonnes,
        deliveryProofUrl: details?.proofUrl || o.deliveryProofUrl,
        deliveryProofNote: noteText,
        pickupCoords: pickup,
        dropCoords: drop,
        currentTruckCoords: drop,
        gpsProgressPercent: 100,
        lastGpsUpdatedAt: nowIso,
        logisticsPartnerId:
          o.logisticsPartnerId || (current?.role === 'logistics' ? current.id : o.logisticsPartnerId),
        logisticsPartnerName:
          o.logisticsPartnerName ||
          (current?.role === 'logistics' ? current.organization || current.name : o.logisticsPartnerName),
        trackingTimeline: timeline,
      };
      return updatedOrder;
    });

    if (!updatedOrder) {
      return { success: false, error: 'Failed to update order.' };
    }

    setToStorage(STORAGE_KEYS.ORDERS, orders);

    const cropLabel = order.cropType.toUpperCase();
    this.addNotification({
      userId: order.farmerId,
      title: `Shipment Delivered! Order #${order.orderNumber}`,
      message: `Shipment Delivered! Order #${order.orderNumber} (${cropLabel}, ${netTonnes}t) has reached ${order.buyerName} via Slip #${slipId}. Awaiting Buyer confirmation & escrow release.`,
      type: 'delivery',
      orderId: order.id,
    });

    this.addNotification({
      userId: order.buyerId,
      title: `Biomass Delivered! Order #${order.orderNumber}`,
      message: `Biomass Delivered! Order #${order.orderNumber} delivered by Logistics (Slip #${slipId}). Please confirm receipt to release ₹${order.farmerTotalPayout.toLocaleString('en-IN')} farmer payout.`,
      type: 'delivery',
      orderId: order.id,
    });

    notifyListeners();
    return { success: true, order: updatedOrder };
  },

  confirmDeliveryAndReleasePayment(
    orderId: string,
    releaseMeta?: { paymentMethod?: PaymentMethod; utrNumber?: string; paymentReference?: string }
  ):
    | { success: true; order: PurchaseOrder; transaction: EscrowTransaction }
    | { success: false; error: string } {
    const current = this.getCurrentUser();
    const order = this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const isAuthorizedBuyer =
      current?.role === 'admin' || (current?.role === 'buyer' && order.buyerId === current.id);

    if (!isAuthorizedBuyer) {
      return {
        success: false,
        error: 'Unauthorized: only the order buyer or an administrator can release escrow payout.',
      };
    }

    if (order.status === 'settled' || order.paymentStatus === 'settled') {
      return {
        success: false,
        error: 'Escrow payment has already been settled for this order.',
      };
    }

    if (!canBuyerPayOrder(order)) {
      return {
        success: false,
        error:
          'Escrow payment can only be initiated after Farmer approval and Logistics truck assignment.',
      };
    }

    const farmer = this.getAllUsers().find((u) => u.id === order.farmerId);
    const hasUpi = Boolean(farmer?.upiId);
    const hasBank = Boolean(farmer?.bankAccountNumber);
    const defaultMethod: PaymentMethod = !hasUpi && hasBank ? 'IMPS/NEFT' : 'UPI';
    const paymentMethod: PaymentMethod = releaseMeta?.paymentMethod || defaultMethod;
    const payoutTarget = hasUpi
      ? farmer!.upiId!
      : hasBank
        ? `A/C ${farmer!.bankAccountNumber} (${farmer!.ifscCode || 'IFSC'})`
        : 'Verified Kisan Bank Escrow';

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date(nowIso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const utrNumber = releaseMeta?.utrNumber || `UTR${Date.now().toString().slice(-10)}`;

    let settledOrder: PurchaseOrder | null = null;
    const orders = this.getOrders().map((o) => {
      if (o.id !== orderId) return o;
      const timeline = o.trackingTimeline.map((step, idx) => ({
        ...step,
        completed: true,
        timestamp: idx === 5 ? nowDisplay : step.completed ? step.timestamp : nowDisplay,
        notes:
          idx === 5
            ? `Settled via ${paymentMethod} to ${payoutTarget} • UTR: ${utrNumber}`
            : step.notes,
      }));
      settledOrder = {
        ...o,
        status: o.status === 'delivered' ? 'settled' : o.status,
        paymentStatus: 'settled',
        paymentMethod,
        escrowPaymentReference: releaseMeta?.paymentReference || o.escrowPaymentReference,
        settledPayoutTarget: payoutTarget,
        utrNumber,
        buyerConfirmedAt: nowIso,
        settledAt: nowIso,
        deliveredAt: o.deliveredAt || nowIso,
        trackingTimeline: timeline,
      };
      return settledOrder;
    });

    if (!settledOrder) {
      return { success: false, error: 'Failed to settle order.' };
    }

    setToStorage(STORAGE_KEYS.ORDERS, orders);

    const transaction: EscrowTransaction = {
      id: `txn-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyerId: order.buyerId,
      farmerId: order.farmerId,
      farmerName: order.farmerName,
      amount: order.farmerTotalPayout,
      paymentMethod,
      payoutDestination: payoutTarget,
      utrNumber,
      status: 'settled',
      settledAt: nowIso,
    };
    const txns = this.getTransactions();
    txns.unshift(transaction);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, txns);

    this.addNotification({
      userId: order.farmerId,
      title: `Payment Credited: ₹${order.farmerTotalPayout.toLocaleString('en-IN')}`,
      message: `Payment Credited: ₹${order.farmerTotalPayout.toLocaleString('en-IN')} settled to ${payoutTarget} for Order #${order.orderNumber} (UTR: ${utrNumber}).`,
      type: 'payment',
      orderId: order.id,
    });

    notifyListeners();
    return { success: true, order: settledOrder, transaction };
  },

  uploadDeliveryProof(
    orderId: string,
    proofUrl: string,
    note: string = 'Certified weighbridge slip uploaded',
    slipId?: string,
    netTonnes?: number
  ) {
    return this.markOrderDelivered(orderId, {
      slipId,
      netTonnes,
      proofUrl,
      notes: note,
    });
  },

  // Escrow Transactions
  getTransactions(farmerId?: string): EscrowTransaction[] {
    const all = getFromStorage<EscrowTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    return farmerId ? all.filter((t) => t.farmerId === farmerId) : all;
  },

  // Calculator Estimates & One-Time Workflow Prefills
  saveCalculatorEstimate(
    estimate: Omit<CalculatorEstimate, 'createdAt'> | CalculatorEstimate
  ): CalculatorEstimate {
    const saved: CalculatorEstimate = {
      ...estimate,
      createdAt:
        'createdAt' in estimate && estimate.createdAt
          ? estimate.createdAt
          : new Date().toISOString(),
    };
    setToStorage(STORAGE_KEYS.CALCULATOR_ESTIMATE, saved);
    notifyListeners();
    return saved;
  },

  getLatestCalculatorEstimate(): CalculatorEstimate | null {
    return getFromStorage<CalculatorEstimate | null>(STORAGE_KEYS.CALCULATOR_ESTIMATE, null);
  },

  setCalculatorPrefill(
    target: 'listing' | 'demand',
    estimate: Omit<CalculatorEstimate, 'createdAt'> | CalculatorEstimate
  ): CalculatorEstimate {
    const saved = this.saveCalculatorEstimate(estimate);
    setToStorage(STORAGE_KEYS.CALCULATOR_PREFILL, { target, estimate: saved });
    notifyListeners();
    return saved;
  },

  consumeCalculatorPrefill(target: 'listing' | 'demand'): CalculatorEstimate | null {
    const payload = getFromStorage<{ target: 'listing' | 'demand'; estimate: CalculatorEstimate } | null>(
      STORAGE_KEYS.CALCULATOR_PREFILL,
      null
    );
    if (!payload || payload.target !== target) return null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEYS.CALCULATOR_PREFILL);
      } catch {
        // ignore storage removal errors
      }
    }
    return payload.estimate;
  },

  // Saved Calculations History
  getSavedCalculations(): SavedCalculation[] {
    return getFromStorage<SavedCalculation[]>(STORAGE_KEYS.SAVED_CALCULATIONS, []);
  },

  saveCalculation(entry: Omit<SavedCalculation, 'id' | 'createdAt'>): SavedCalculation {
    const existing = this.getSavedCalculations();
    const saved: SavedCalculation = {
      ...entry,
      id: `calc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [saved, ...existing].slice(0, 50);
    setToStorage(STORAGE_KEYS.SAVED_CALCULATIONS, next);
    notifyListeners();
    return saved;
  },

  deleteSavedCalculation(id: string): void {
    const filtered = this.getSavedCalculations().filter((c) => c.id !== id);
    setToStorage(STORAGE_KEYS.SAVED_CALCULATIONS, filtered);
    notifyListeners();
  },

  // Notifications
  getNotifications(userId?: string): PlatformNotification[] {
    const all = getFromStorage<PlatformNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return userId ? all.filter((n) => n.userId === userId) : all;
  },

  addNotification(entry: Omit<PlatformNotification, 'id' | 'read' | 'createdAt'>): PlatformNotification {
    const list = this.getNotifications();
    const item: PlatformNotification = {
      ...entry,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyListeners();
    return item;
  },

  markNotificationRead(id: string) {
    const updated = this.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
    notifyListeners();
  },

  markAllNotificationsRead(userId: string) {
    const updated = this.getNotifications().map((n) =>
      n.userId === userId ? { ...n, read: true } : n
    );
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
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
  getPlatformSettings(useStorage: boolean = true): PlatformSettings {
    if (!useStorage) return DEFAULT_SETTINGS;
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
  getPlatformStats(useStorage: boolean = true) {
    const listings = useStorage ? this.getListings() : INITIAL_LISTINGS;
    const demands = useStorage ? this.getDemands() : INITIAL_DEMANDS;
    const orders = useStorage ? this.getOrders() : INITIAL_ORDERS;
    const users = useStorage ? this.getAllUsers() : INITIAL_USERS;

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
    const active = this.getCurrentUser();
    setToStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    setToStorage(STORAGE_KEYS.CURRENT_USER, active?.role === 'admin' ? active : null);
    setToStorage(STORAGE_KEYS.LISTINGS, INITIAL_LISTINGS);
    setToStorage(STORAGE_KEYS.DEMANDS, INITIAL_DEMANDS);
    setToStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    setToStorage(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    setToStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    setToStorage(STORAGE_KEYS.NOTIFICATIONS, []);
    setToStorage(STORAGE_KEYS.TRANSACTIONS, []);
    notifyListeners();
  },
};
