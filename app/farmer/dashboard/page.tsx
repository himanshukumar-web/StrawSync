'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wheat,
  Plus,
  Coins,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Scale,
  Sparkles,
  Bell,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import AddResidueModal from '../../../components/AddResidueModal';
import {
  ResidueListing,
  PurchaseOrder,
  UserProfile,
  PlatformNotification,
  EscrowTransaction,
  CalculatorEstimate,
} from '../../../types';
import {
  StrawSyncStore,
  formatWeight,
  formatUnitPrice,
} from '../../../lib/store';

export default function FarmerDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [latestEstimate, setLatestEstimate] = useState<CalculatorEstimate | null>(null);
  const [listingPrefill, setListingPrefill] = useState<CalculatorEstimate | null>(null);
  const [actionMsg, setActionMsg] = useState<string>('');

  const [upiId, setUpiId] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [payoutFeedback, setPayoutFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  useEffect(() => {
    const syncAll = () => {
      const user = StrawSyncStore.getCurrentUser();
      setCurrentUser(user);
      setListings(StrawSyncStore.getListings());
      setOrders(StrawSyncStore.getOrders());
      setLatestEstimate(StrawSyncStore.getLatestCalculatorEstimate());
      setNotifications(user ? StrawSyncStore.getNotifications(user.id) : []);
      setTransactions(
        user?.role === 'admin'
          ? StrawSyncStore.getTransactions()
          : user
            ? StrawSyncStore.getTransactions(user.id)
            : []
      );

      if (user && user.id !== loadedUserId) {
        setLoadedUserId(user.id);
        setUpiId(user.upiId || '');
        setBankHolderName(user.bankHolderName || user.name || '');
        setBankAccountNumber(user.bankAccountNumber || '');
        setIfscCode(user.ifscCode || '');
      }
    };

    syncAll();
    const unsubscribe = StrawSyncStore.subscribe(syncAll);
    return () => unsubscribe();
  }, [loadedUserId]);

  const isAdminView = currentUser?.role === 'admin';
  const farmerListings = isAdminView
    ? listings
    : currentUser
      ? listings.filter((l) => l.farmerId === currentUser.id)
      : [];
  const totalTonnes = farmerListings.reduce((sum, l) => sum + l.recoverableTonnes, 0);
  const availableTonnes = farmerListings
    .filter((l) => l.status === 'verified' || l.status === 'pending')
    .reduce((sum, l) => sum + l.recoverableTonnes, 0);
  const farmerOrders = isAdminView
    ? orders
    : currentUser
      ? orders.filter((o) => o.farmerId === currentUser.id)
      : [];
  const settledEarnings = farmerOrders
    .filter((o) => o.status === 'settled' || o.paymentStatus === 'settled')
    .reduce((sum, o) => sum + o.farmerTotalPayout, 0);
  const escrowEarnings = farmerOrders
    .filter(
      (o) =>
        o.status !== 'requested' &&
        o.status !== 'cancelled' &&
        o.status !== 'settled' &&
        o.paymentStatus !== 'settled'
    )
    .reduce((sum, o) => sum + o.farmerTotalPayout, 0);
  const totalSoldTonnes = farmerOrders
    .filter((o) => o.status === 'delivered' || o.status === 'settled')
    .reduce((sum, o) => sum + o.quantityTonnes, 0);
  const pendingRequests = farmerOrders.filter((o) => o.status === 'requested');
  const deliveryAndPaymentAlerts = notifications.filter(
    (n) => n.type === 'delivery' || n.type === 'payment'
  );

  const handleSavePayoutDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'farmer') return;
    const res = StrawSyncStore.updatePayoutDetails(currentUser.id, {
      upiId,
      bankHolderName,
      bankAccountNumber,
      ifscCode,
    });
    if (!res.success) {
      setPayoutFeedback({ type: 'err', text: res.error });
    } else {
      const target = res.user.upiId || `A/C ${res.user.bankAccountNumber} (${res.user.ifscCode})`;
      setPayoutFeedback({ type: 'ok', text: `Payout destination saved: ${target}` });
    }
    setTimeout(() => setPayoutFeedback(null), 5000);
  };

  const handleAcceptRequest = (orderId: string, buyerName: string) => {
    StrawSyncStore.acceptPurchaseRequest(orderId);
    setActionMsg(`Accepted purchase request from ${buyerName}! Shipment queued for logistics pickup.`);
    setTimeout(() => setActionMsg(''), 4500);
  };

  const handleRejectRequest = (orderId: string, buyerName: string) => {
    StrawSyncStore.rejectPurchaseRequest(orderId);
    setActionMsg(`Declined request from ${buyerName}. Lot remains available on the exchange.`);
    setTimeout(() => setActionMsg(''), 4500);
  };

  return (
    <DashboardLayout role="farmer" title="Farmer Overview Dashboard">
      <div className="space-y-8">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-forest-100 text-forest flex items-center justify-center font-bold text-2xl shrink-0">
              🌾
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-charcoal">
                  {isAdminView
                    ? 'Farmer Operations Hub — All Registered Farms'
                    : `Kisan Dashboard — ${currentUser?.name || 'Farmer'}`}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isAdminView
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-emerald-50 text-forest border-forest-200'
                }`}>
                  {isAdminView ? 'Admin Oversight View' : 'Aadhaar & Land Verified'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-forest" />
                {isAdminView ? (
                  <span>Platform-wide Kisan supply lots & buyer purchase approvals (Inspector: {currentUser?.name})</span>
                ) : (
                  <>
                    <span>{currentUser?.location || 'Registered Farm Location'}</span>
                    <span>•</span>
                    <span>{currentUser?.phone || 'Verified Contact'}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setListingPrefill(null);
              setShowAddModal(true);
            }}
            className="px-5 py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>List New Residue Lot</span>
          </button>
        </div>

        {latestEstimate && !isAdminView && (
          <div className="p-4 rounded-2xl bg-forest-50/60 border border-forest-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-forest-900">
                Latest Calculator Insight ({latestEstimate.cropType.toUpperCase()} • {latestEstimate.quantityTonnes}t @ ₹{latestEstimate.pricePerTonne.toLocaleString('en-IN')}/t):
              </span>{' '}
              <span className="text-forest-800">
                Est. Payout ₹{latestEstimate.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setListingPrefill(latestEstimate);
                setShowAddModal(true);
              }}
              className="px-3.5 py-1.5 bg-forest hover:bg-forest-700 text-white rounded-xl font-bold shrink-0 transition"
            >
              Use in New Listing
            </button>
          </div>
        )}

        {actionMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Recent Delivery & Payout Alerts */}
        {deliveryAndPaymentAlerts.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-forest-200 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-forest" />
                <h2 className="text-sm font-bold text-charcoal">
                  Recent Delivery & Payout Alerts ({deliveryAndPaymentAlerts.filter((n) => !n.read).length} unread)
                </h2>
              </div>
              {currentUser && deliveryAndPaymentAlerts.some((n) => !n.read) && (
                <button
                  onClick={() => StrawSyncStore.markAllNotificationsRead(currentUser.id)}
                  className="text-[11px] font-bold text-forest hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="space-y-2">
              {deliveryAndPaymentAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => StrawSyncStore.markNotificationRead(alert.id)}
                  className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 cursor-pointer transition ${
                    alert.type === 'payment'
                      ? 'bg-emerald-50 border-forest-200 text-forest-900'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      {!alert.read && <span className="w-2 h-2 rounded-full bg-forest shrink-0" />}
                      <span>{alert.title}</span>
                    </div>
                    <p className="text-[11px] mt-0.5">{alert.message}</p>
                  </div>
                  <span className="text-[10px] opacity-75 shrink-0">
                    {new Date(alert.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-earth-border shadow-subtle">
            <div className="text-xs font-bold text-charcoal-muted uppercase flex items-center justify-between">
              <span>Total Residue Registered</span>
              <Scale className="w-4 h-4 text-forest" />
            </div>
            <div className="text-2xl font-extrabold text-charcoal mt-2">
              {totalTonnes.toFixed(1)}{' '}
              <span className="text-xs font-medium text-charcoal-muted">tonnes</span>
            </div>
            <div className="text-[11px] text-charcoal-muted mt-1">
              Across {farmerListings.length} registered plots
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-earth-border shadow-subtle">
            <div className="text-xs font-bold text-charcoal-muted uppercase flex items-center justify-between">
              <span>Available for Pickup</span>
              <Wheat className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-forest mt-2">
              {availableTonnes.toFixed(1)}{' '}
              <span className="text-xs font-medium text-forest-600">tonnes</span>
            </div>
            <div className="text-[11px] text-forest-700 mt-1">
              Active on Exchange
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-earth-border shadow-subtle">
            <div className="text-xs font-bold text-charcoal-muted uppercase flex items-center justify-between">
              <span>Total Sold Quantity</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-blue-800 mt-2">
              {totalSoldTonnes.toFixed(1)}{' '}
              <span className="text-xs font-medium text-blue-600">tonnes</span>
            </div>
            <div className="text-[11px] text-charcoal-muted mt-1">
              Fulfilled to biomass plants
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-earth-border shadow-subtle">
            <div className="text-xs font-bold text-charcoal-muted uppercase flex items-center justify-between">
              <span>Active Dispatches</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-extrabold text-charcoal mt-2">
              {farmerOrders.filter((o) => o.status !== 'settled' && o.status !== 'cancelled').length}{' '}
              <span className="text-xs font-medium text-charcoal-muted">trucks</span>
            </div>
            <div className="text-[11px] text-charcoal-muted mt-1">
              En route or at weighbridge
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-forest-200 bg-forest-50/30 shadow-subtle">
            <div className="text-xs font-bold text-forest-800 uppercase flex items-center justify-between">
              <span>Settled Earnings</span>
              <Coins className="w-4 h-4 text-forest" />
            </div>
            <div className="text-2xl font-extrabold text-forest mt-2">
              ₹{settledEarnings.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-forest-700 mt-1 font-semibold">
              In Escrow: ₹{escrowEarnings.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Incoming Purchase Requests Section */}
        <div className="bg-emerald-50/40 rounded-3xl p-6 sm:p-8 border border-forest-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${pendingRequests.length > 0 ? 'bg-forest animate-pulse' : 'bg-charcoal-muted/40'}`} />
                <h2 className="text-lg font-bold text-forest-900">
                  Incoming Purchase Requests from Buyers ({pendingRequests.length})
                </h2>
              </div>
              <p className="text-xs text-forest-700 mt-0.5">
                Review direct purchase offers from verified biomass processing facilities
              </p>
            </div>
            <Link
              href="/farmer/orders"
              className="text-xs font-bold text-forest hover:underline flex items-center gap-1"
            >
              <span>Manage Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-earth-border text-xs text-charcoal-muted text-center">
              No pending buyer purchase requests right now. New offers from buyers on your residue lots will appear here automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-white border border-forest-200 shadow-subtle space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-charcoal text-sm">{req.buyerName}</span>
                      <span className="block text-[11px] text-charcoal-muted">{req.deliveryLocation.facility}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      Pending Farmer Action
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-sand border border-earth-border grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-charcoal-muted block">Requested</span>
                      <strong className="text-charcoal">{req.quantityTonnes} Tonnes</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-charcoal-muted block">Farmgate Rate</span>
                      <strong className="text-forest">₹{req.farmgateRate}/t</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-charcoal-muted block">Total Escrow</span>
                      <strong className="text-forest-800">₹{req.farmerTotalPayout.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-charcoal-muted">
                      Crop: <strong>{req.cropType.toUpperCase()}</strong> • Dist: <strong>{req.distanceKm} km</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRejectRequest(req.id, req.buyerName)}
                        className="px-3 py-1.5 rounded-xl border border-earth-border text-charcoal-muted hover:text-red-700 hover:bg-red-50 text-xs font-bold transition"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.buyerName)}
                        className="px-4 py-1.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-subtle"
                      >
                        Accept Request
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Residue Listings */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Recent Residue Listings
              </h2>
              <p className="text-xs text-charcoal-muted">
                {isAdminView ? 'Platform-wide registered farmgate lots' : 'Your registered farmgate stubble lots on the exchange'}
              </p>
            </div>
            <Link
              href="/farmer/listings"
              className="text-xs font-bold text-forest hover:underline flex items-center gap-1"
            >
              <span>Manage All Listings ({farmerListings.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {farmerListings.length === 0 ? (
            <div className="p-6 rounded-2xl bg-sand border border-earth-border text-xs text-charcoal-muted text-center">
              No residue lots registered yet. Click &ldquo;List New Residue Lot&rdquo; above to add your field crop stubble.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmerListings.slice(0, 3).map((listing) => (
                <div
                  key={listing.id}
                  className="p-5 rounded-2xl bg-sand border border-earth-border text-xs space-y-3"
                >
                  {listing.imageUrl && (
                    <img
                      src={listing.imageUrl}
                      alt={listing.cropName}
                      className="w-full h-28 object-cover rounded-xl border border-earth-border bg-white"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-charcoal">{listing.cropName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-forest shrink-0">
                      {listing.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-charcoal-muted">
                    <div>
                      <span>Quantity:</span>
                      <strong className="text-charcoal block">
                        {formatWeight(
                          listing.originalQuantity ?? listing.recoverableTonnes,
                          listing.weightUnit
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Price:</span>
                      <strong className="text-forest block">
                        {listing.weightUnit &&
                        listing.weightUnit !== 'tonne' &&
                        listing.pricePerUnit !== undefined
                          ? formatUnitPrice(listing.pricePerUnit, listing.weightUnit)
                          : `₹${listing.expectedPricePerTonne}/t`}
                      </strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-charcoal-muted">
                    Location: {listing.village}, {listing.district}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Dispatches */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Active Order Tracking & Escrow Progress
              </h2>
              <p className="text-xs text-charcoal-muted">
                Live delivery milestones from field gate to certified weighbridge
              </p>
            </div>
            <Link
              href="/farmer/orders"
              className="text-xs font-bold text-forest hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="p-6 rounded-2xl bg-sand border border-earth-border text-xs text-charcoal-muted text-center">
              No active dispatches or orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {farmerOrders.slice(0, 2).map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-sand border border-earth-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-charcoal">Order #{order.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-charcoal-muted mt-1">
                      Buyer: <strong>{order.buyerName}</strong> • {order.quantityTonnes}t {order.cropType.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-forest text-sm">
                      ₹{order.farmerTotalPayout.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-charcoal-muted">Escrow Guaranteed</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment & Escrow Settlement Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-earth-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage text-forest flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-charcoal">
                  Payment & Escrow Settlement
                </h2>
                <p className="text-xs text-charcoal-muted">
                  Configure your UPI ID or Bank Account for instant escrow release upon plant delivery confirmation
                </p>
              </div>
            </div>
            {currentUser?.upiId && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-forest-200 text-xs font-bold text-forest">
                Active UPI: {currentUser.upiId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {!isAdminView && (
              <form onSubmit={handleSavePayoutDetails} className="lg:col-span-6 space-y-3 text-xs">
                {payoutFeedback && (
                  <div className={`p-3 rounded-xl border font-semibold ${
                    payoutFeedback.type === 'ok'
                      ? 'bg-emerald-50 border-forest-200 text-forest-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {payoutFeedback.text}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Farmer UPI ID (Preferred Instant Payout)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. himanshu.kisan@okaxis"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-sand border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      placeholder="Account holder name"
                      value={bankHolderName}
                      onChange={(e) => setBankHolderName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-sand border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-sand border border-earth-border rounded-xl font-semibold text-charcoal uppercase focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Bank Account Number (NEFT / IMPS Fallback)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional if UPI ID provided"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-sand border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle transition"
                >
                  Save Payout Details
                </button>
              </form>
            )}

            <div className={`${isAdminView ? 'lg:col-span-12' : 'lg:col-span-6'} space-y-3`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-charcoal uppercase">Settled Payout & UTR Ledger</span>
                <span className="text-charcoal-muted">{transactions.length} settled transactions</span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-sand border border-earth-border text-xs text-charcoal-muted text-center">
                  No settled bank/UPI payouts yet. Once a buyer confirms delivery receipt, funds release here with an official UTR reference.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="p-3.5 rounded-2xl bg-sand border border-earth-border text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-charcoal flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                          <span>Order #{txn.orderNumber}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-forest text-[10px]">
                            {txn.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-charcoal-muted mt-0.5">
                          Credited to <strong>{txn.payoutDestination}</strong> • UTR: <span className="font-mono font-bold text-charcoal">{txn.utrNumber}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-forest text-sm">
                          ₹{txn.amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-charcoal-muted">
                          {new Date(txn.settledAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddResidueModal
        isOpen={showAddModal}
        initialPrefill={listingPrefill}
        onClose={() => {
          setShowAddModal(false);
          setListingPrefill(null);
        }}
      />
    </DashboardLayout>
  );
}
