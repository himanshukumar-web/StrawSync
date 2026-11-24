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
  Sparkles
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import AddResidueModal from '../../../components/AddResidueModal';
import { ResidueListing, PurchaseOrder } from '../../../types';
import { StrawSyncStore } from '../../../lib/store';

export default function FarmerDashboardPage() {
  const [currentUser, setCurrentUser] = useState(StrawSyncStore.getCurrentUser());
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMsg, setActionMsg] = useState<string>('');

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    setListings(StrawSyncStore.getListings());
    setOrders(StrawSyncStore.getOrders());

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setListings(StrawSyncStore.getListings());
      setOrders(StrawSyncStore.getOrders());
    });
    return () => unsubscribe();
  }, []);

  const totalTonnes = listings.reduce((sum, l) => sum + l.recoverableTonnes, 0);
  const availableTonnes = listings
    .filter((l) => l.status === 'verified' || l.status === 'pending')
    .reduce((sum, l) => sum + l.recoverableTonnes, 0);
  const farmerOrders = orders.filter((o) => o.farmerName.includes(currentUser?.name || 'Gurpreet') || true);
  const totalEarned = farmerOrders.reduce((sum, o) => sum + o.farmerTotalPayout, 0);
  const totalSoldTonnes = farmerOrders
    .filter((o) => o.status === 'delivered' || o.status === 'settled')
    .reduce((sum, o) => sum + o.quantityTonnes, 0);
  const pendingRequests = farmerOrders.filter((o) => o.status === 'requested');

  const handleAcceptRequest = (orderId: string, buyerName: string) => {
    StrawSyncStore.acceptPurchaseRequest(orderId);
    setActionMsg(`Accepted purchase request from ${buyerName}! Logistics partner dispatch allocated.`);
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-charcoal">
                  Kisan Dashboard — {currentUser?.name || 'Sardar Gurpreet Singh'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-forest text-xs font-bold border border-forest-200">
                  Aadhaar & Land Verified
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-forest" />
                <span>{currentUser?.location || 'Dhuri Village, Sangrur, Punjab'}</span>
                <span>•</span>
                <span>{currentUser?.phone || '+91 98721 44520'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>List New Residue Lot</span>
          </button>
        </div>

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
              Across {listings.length} registered plots
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

          <div className="bg-white p-5 rounded-2xl border border-forest-200 bg-forest-50/20 shadow-subtle">
            <div className="text-xs font-bold text-forest-800 uppercase flex items-center justify-between">
              <span>Farmer Earnings</span>
              <Coins className="w-4 h-4 text-forest" />
            </div>
            <div className="text-2xl font-extrabold text-forest mt-2">
              ₹{totalEarned.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-forest-700 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Direct Bank Escrow</span>
            </div>
          </div>
        </div>

        {/* Incoming Purchase Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="bg-emerald-50/40 rounded-3xl p-6 sm:p-8 border border-forest-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-forest animate-pulse" />
                  <h2 className="text-lg font-bold text-forest-900">
                    Interested Buyers — Pending Purchase Requests ({pendingRequests.length})
                  </h2>
                </div>
                <p className="text-xs text-forest-700 mt-0.5">
                  Review direct purchase offers from verified biomass processing facilities
                </p>
              </div>
            </div>

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
                      Offer Awaiting Farmer Action
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
                        Decline
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.buyerName)}
                        className="px-4 py-1.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-subtle"
                      >
                        Accept & Lock Escrow
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Residue Listings */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Recent Residue Listings
              </h2>
              <p className="text-xs text-charcoal-muted">
                Your registered farmgate stubble lots on the exchange
              </p>
            </div>
            <Link
              href="/farmer/listings"
              className="text-xs font-bold text-forest hover:underline flex items-center gap-1"
            >
              <span>Manage All Listings ({listings.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((listing) => (
              <div
                key={listing.id}
                className="p-5 rounded-2xl bg-sand border border-earth-border text-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-charcoal">{listing.cropName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-forest">
                    {listing.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-charcoal-muted">
                  <div>
                    <span>Quantity:</span>
                    <strong className="text-charcoal block">{listing.recoverableTonnes} Tonnes</strong>
                  </div>
                  <div>
                    <span>Price:</span>
                    <strong className="text-forest block">₹{listing.expectedPricePerTonne}/t</strong>
                  </div>
                </div>
                <div className="text-[11px] text-charcoal-muted">
                  Location: {listing.village}, {listing.district}
                </div>
              </div>
            ))}
          </div>
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
        </div>
      </div>

      <AddResidueModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </DashboardLayout>
  );
}
