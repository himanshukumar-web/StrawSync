'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Navigation,
  Scale,
  Fuel,
  Coins,
  ShieldCheck
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import { PurchaseOrder, OrderStatus, UserProfile } from '../../../types';
import { StrawSyncStore, formatWeight } from '../../../lib/store';
import { FLEET_OPTIONS } from '../../../lib/engine';

const MapComponent = dynamic(() => import('../../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-2xl bg-sand border border-earth-border flex items-center justify-center text-xs font-semibold text-charcoal-muted">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
        Loading Fleet Corridors...
      </span>
    </div>
  ),
});

export default function LogisticsDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string>('');
  const [vehicleInputMap, setVehicleInputMap] = useState<Record<string, string>>({});
  const [proofModalOrder, setProofModalOrder] = useState<PurchaseOrder | null>(null);
  const [slipNumber, setSlipNumber] = useState('WB-2026-9812');
  const [grossWeight, setGrossWeight] = useState('24.8');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    const allOrders = StrawSyncStore.getOrders();
    setOrders(allOrders);

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      const updated = StrawSyncStore.getOrders();
      setOrders(updated);
      setSelectedOrder((prev) => (prev ? updated.find((o) => o.id === prev.id) || null : null));
    });
    return () => unsubscribe();
  }, []);

  const isAdminView = currentUser?.role === 'admin';
  // Hide unconfirmed ('requested') requests until farmer acceptance; scope to own fleet + open jobs
  const logisticsOrders = orders.filter(
    (o) =>
      o.status !== 'requested' &&
      (isAdminView || !o.logisticsPartnerId || o.logisticsPartnerId === currentUser?.id)
  );

  const handleAdvanceStatus = (orderId: string, nextStatus: OrderStatus, noteText?: string) => {
    if (nextStatus === 'delivered') {
      const res = StrawSyncStore.markOrderDelivered(orderId, { notes: noteText });
      if (!res.success) {
        setUpdateMsg(res.error);
        setTimeout(() => setUpdateMsg(''), 4000);
        return;
      }
      setUpdateMsg(`Shipment #${res.order.orderNumber} marked Delivered! Farmer & Buyer notified in real time.`);
      setTimeout(() => setUpdateMsg(''), 4500);
      return;
    }

    const partner =
      currentUser && currentUser.role === 'logistics'
        ? { id: currentUser.id, name: currentUser.organization || currentUser.name }
        : undefined;
    StrawSyncStore.updateOrderStatus(orderId, nextStatus, noteText, partner);
    setUpdateMsg(`Order status successfully updated to ${nextStatus.toUpperCase().replace(/_/g, ' ')}!`);
    setTimeout(() => setUpdateMsg(''), 4000);
  };

  const handleBroadcastStepGps = (order: PurchaseOrder) => {
    const vehicleNumber = (vehicleInputMap[order.id] ?? order.vehicleNumber)?.trim() || undefined;
    const res = StrawSyncStore.broadcastTruckGps(order.id, {
      advancePercent: 25,
      vehicleNumber,
    });
    if (!res.success) {
      setUpdateMsg(res.error);
    } else {
      setSelectedOrder(res.order);
      setUpdateMsg(
        `GPS Ping Broadcast for #${res.order.orderNumber}: ${res.order.gpsProgressPercent}% route (${res.order.currentTruckCoords?.[0].toFixed(4)}°N, ${res.order.currentTruckCoords?.[1].toFixed(4)}°E)`
      );
    }
    setTimeout(() => setUpdateMsg(''), 4500);
  };

  const handleBroadcastDeviceGps = (order: PurchaseOrder) => {
    const vehicleNumber = (vehicleInputMap[order.id] ?? order.vehicleNumber)?.trim() || undefined;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUpdateMsg('Browser Geolocation unavailable — use Broadcast Live GPS (+25% Route) instead.');
      setTimeout(() => setUpdateMsg(''), 4500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const res = StrawSyncStore.broadcastTruckGps(order.id, {
          coords: [pos.coords.latitude, pos.coords.longitude],
          vehicleNumber,
        });
        if (!res.success) {
          setUpdateMsg(res.error);
        } else {
          setSelectedOrder(res.order);
          setUpdateMsg(
            `Device GPS Ping Recorded for #${res.order.orderNumber} (${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E)`
          );
        }
        setTimeout(() => setUpdateMsg(''), 4500);
      },
      () => {
        setUpdateMsg('Device GPS permission denied/unavailable — use Broadcast Live GPS (+25% Route) instead.');
        setTimeout(() => setUpdateMsg(''), 4500);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleUploadProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModalOrder) return;

    const res = StrawSyncStore.uploadDeliveryProof(
      proofModalOrder.id,
      `https://strawsync.gov.in/slips/${slipNumber}.pdf`,
      `Verified Weighbridge Slip #${slipNumber} • Gross ${grossWeight}t, Net ${grossWeight}t`,
      slipNumber,
      Number(grossWeight) || proofModalOrder.quantityTonnes
    );
    if (!res.success) {
      setUpdateMsg(res.error);
      setTimeout(() => setUpdateMsg(''), 4500);
      return;
    }
    setUpdateMsg(
      `Delivery proof slip #${slipNumber} uploaded and marked Delivered! Farmer & Buyer notified in real time.`
    );
    setProofModalOrder(null);
    setTimeout(() => setUpdateMsg(''), 4500);
  };

  const filteredOrders = logisticsOrders.filter((o) => {
    if (statusFilter === 'active') return o.status !== 'settled' && o.status !== 'cancelled';
    if (statusFilter === 'completed') return o.status === 'settled' || o.status === 'delivered';
    return true;
  });

  const totalHaulageEarnings = logisticsOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.logisticsTotalPayout, 0);
  const activeDispatches = logisticsOrders.filter((o) => o.status !== 'settled' && o.status !== 'cancelled');

  return (
    <DashboardLayout role="logistics" title="Smart Logistics Fleet Dispatch">
      <div className="space-y-8">
        {/* Top Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl shrink-0">
              🚛
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-charcoal">
                  {isAdminView
                    ? 'Logistics Dispatch Command — All Fleet Corridors'
                    : `Smart Rural Logistics Fleet — ${currentUser?.organization || currentUser?.name || 'Logistics Fleet'}`}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isAdminView
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {isAdminView ? 'Admin Oversight View' : 'GPS & Weighbridge Integrated'}
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                {isAdminView ? (
                  <span>Platform-wide haulage dispatches & weighbridge tracking (Inspector: {currentUser?.name})</span>
                ) : (
                  <>
                    <span>Base Hub: {currentUser?.location || 'Registered Fleet Hub'}</span>
                    <span>•</span>
                    <span>Fleet Manager: {currentUser?.name}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-charcoal-muted uppercase block">
              Fleet Haulage Revenue
            </span>
            <span className="text-2xl font-bold text-forest">
              ₹{totalHaulageEarnings.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {updateMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{updateMsg}</span>
            </div>
            <button onClick={() => setUpdateMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Fleet Inventory */}
        <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-charcoal">
              Standard Agricultural Residue Fleet Inventory
            </h2>
            <span className="text-xs font-semibold text-charcoal-muted">
              4 Dedicated Vehicle Classes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FLEET_OPTIONS.map((fleet) => (
              <div
                key={fleet.type}
                className="p-4 rounded-2xl bg-sand border border-earth-border text-xs space-y-2"
              >
                <div className="font-bold text-charcoal flex items-center justify-between">
                  <span>{fleet.name.split('(')[0]}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-earth-border text-[10px]">
                    {fleet.capacityTonnes}t Cap.
                  </span>
                </div>
                <div className="text-[11px] text-charcoal-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Haulage Rate:</span>
                    <span className="font-semibold text-charcoal">₹{fleet.ratePerKm}/km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loading Base:</span>
                    <span className="font-semibold text-charcoal">₹{fleet.baseLoadingCharge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CO₂ Factor:</span>
                    <span className="font-semibold text-emerald-700">{fleet.co2PerKmKg} kg/km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Map */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Active Stubble Transport Corridors &amp; Dispatches
              </h2>
              <p className="text-xs text-charcoal-muted">
                Live farmgate-to-factory routes with certified haulage distance calculations
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedOrder && (
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200 transition"
                >
                  Showing #{selectedOrder.orderNumber} • Reset View
                </button>
              )}
              <span className="text-xs font-bold text-forest bg-sage px-3 py-1 rounded-full border border-forest-100">
                {activeDispatches.length} Trucks En Route
              </span>
            </div>
          </div>

          <MapComponent
            orders={logisticsOrders}
            trackedOrder={selectedOrder}
            height="360px"
            zoom={8}
            center={{ lat: 29.8, lng: 76.5 }}
          />
        </div>

        {/* Assigned Dispatches List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Assigned Transport Tasks & Milestone Updates
              </h2>
              <p className="text-xs text-charcoal-muted">
                Execute rural pickup, weighbridge calibration, and certified plant delivery
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-subtle'
                    : 'bg-white text-charcoal border border-earth-border hover:bg-sand'
                }`}
              >
                All ({logisticsOrders.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'active'
                    ? 'bg-amber-600 text-white shadow-subtle'
                    : 'bg-white text-charcoal border border-earth-border hover:bg-sand'
                }`}
              >
                Active ({activeDispatches.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'completed'
                    ? 'bg-amber-600 text-white shadow-subtle'
                    : 'bg-white text-charcoal border border-earth-border hover:bg-sand'
                }`}
              >
                Completed ({logisticsOrders.filter((o) => o.status === 'settled' || o.status === 'delivered').length})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-earth-border text-xs text-charcoal-muted">
                No confirmed transport dispatches in this view yet.
              </div>
            ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-earth-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal">
                        Dispatch #{order.orderNumber}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-charcoal-muted">
                        • {order.cropType.toUpperCase()} ({formatWeight(order.displayQuantity ?? order.quantityTonnes, order.weightUnit)})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-forest border border-forest-200">
                        GPS {order.gpsProgressPercent ?? 0}%
                      </span>
                    </div>

                    <div className="text-xs text-charcoal-soft mt-1 flex flex-wrap items-center gap-2">
                      <span>Pickup: <strong>{order.pickupLocation.village}, {order.pickupLocation.district} ({order.farmerName})</strong></span>
                      <span>→</span>
                      <span>Delivery: <strong>{order.deliveryLocation.facility}</strong></span>
                      <span>•</span>
                      <span>Distance: <strong>{order.distanceKm} km</strong></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-charcoal-muted uppercase block">
                      Logistics Transit Payout
                    </span>
                    <span className="text-base font-bold text-forest">
                      ₹{order.logisticsTotalPayout.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Milestone Steps */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  {order.trackingTimeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-center transition ${
                        step.completed
                          ? 'bg-emerald-50 border-forest-200 text-forest'
                          : 'bg-sand border-earth-border text-charcoal-muted'
                      }`}
                    >
                      <div className="w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 border border-current">
                        {step.completed ? '✓' : idx + 1}
                      </div>
                      <div className="text-[11px] font-bold leading-tight">
                        {step.step}
                      </div>
                      <div className="text-[9px] mt-1 opacity-75 truncate">
                        {step.timestamp}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Controls */}
                <div className="pt-2 border-t border-earth-border flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-charcoal-muted">
                    <span>
                      Vehicle: <strong>{order.vehicleType}</strong>
                    </span>
                    <input
                      type="text"
                      value={vehicleInputMap[order.id] ?? order.vehicleNumber ?? ''}
                      onChange={(e) =>
                        setVehicleInputMap((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="PB-13-TR-4421"
                      className="w-32 px-2 py-1 rounded-lg bg-sand border border-earth-border text-[11px] font-mono font-bold text-charcoal focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.status !== 'delivered' &&
                      order.status !== 'settled' &&
                      order.status !== 'cancelled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBroadcastStepGps(order)}
                            className="px-3 py-2 bg-forest hover:bg-forest-700 text-white rounded-xl font-bold transition flex items-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Broadcast Live GPS (+25% Route)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBroadcastDeviceGps(order)}
                            className="px-3 py-2 bg-white border border-earth-border hover:border-forest text-charcoal rounded-xl font-bold transition"
                          >
                            Use Device GPS
                          </button>
                        </>
                      )}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(selectedOrder?.id === order.id ? null : order)
                      }
                      className="px-3 py-2 bg-sand hover:bg-forest-50 border border-earth-border text-charcoal rounded-xl font-bold transition"
                    >
                      {selectedOrder?.id === order.id ? 'Unfocus Map' : 'Focus GPS Map'}
                    </button>
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'logistics_assigned', 'Driver & Vehicle Allocated')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition"
                      >
                        Assign Truck & Driver
                      </button>
                    )}

                    {(order.status === 'accepted' || order.status === 'logistics_assigned') && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'pickup_en_route', 'Truck En Route to Farmgate')}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition"
                      >
                        Dispatch Truck to Farmgate
                      </button>
                    )}

                    {order.status === 'pickup_en_route' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'loaded_and_weighed', `Gross Slip 24.2t, Net ${order.quantityTonnes}t`)}
                        className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold transition"
                      >
                        Confirm Weighbridge Scale & Load
                      </button>
                    )}

                    {order.status === 'loaded_and_weighed' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'in_transit', 'Truck On Highway to Plant')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition"
                      >
                        Start Transit to Facility
                      </button>
                    )}

                    {order.status === 'in_transit' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'delivered', 'Gate Entry Complete. Unloaded & Delivered at Buyer Plant.')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition"
                      >
                        Mark Delivered
                      </button>
                    )}

                    {order.status !== 'settled' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => setProofModalOrder(order)}
                        className="px-3.5 py-2 bg-white border border-earth-border hover:border-amber-400 text-charcoal rounded-xl font-bold transition flex items-center gap-1.5"
                      >
                        <Scale className="w-3.5 h-3.5 text-amber-600" />
                        <span>Upload Weighbridge Proof</span>
                      </button>
                    )}

                    {order.deliveryProofUrl && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-forest border border-forest-200 text-[11px] font-bold">
                        Proof Verified ✓
                      </span>
                    )}

                    {order.status === 'delivered' && (
                      isAdminView ? (
                        <button
                          onClick={() => {
                            const res = StrawSyncStore.confirmDeliveryAndReleasePayment(order.id);
                            setUpdateMsg(
                              res.success
                                ? `Admin settled escrow for #${order.orderNumber} (UTR: ${res.transaction.utrNumber}).`
                                : res.error
                            );
                          }}
                          className="px-3.5 py-2 bg-forest hover:bg-forest-700 text-white rounded-xl font-bold transition"
                        >
                          Confirm & Release Escrow (Admin)
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                          Delivered • Awaiting Buyer Confirmation
                        </span>
                      )
                    )}

                    {order.status === 'settled' && (
                      <span className="px-3.5 py-2 rounded-xl bg-emerald-100 text-forest font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed & Settled</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      </div>

      {/* Weighbridge Proof Upload Modal */}
      {proofModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-earth-border shadow-elevated p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-earth-border">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-charcoal">
                  Upload Weighbridge Proof & Weight Slip
                </h3>
              </div>
              <button
                onClick={() => setProofModalOrder(null)}
                className="text-charcoal-muted hover:text-charcoal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadProof} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  Government Certified Weighbridge Slip Number
                </label>
                <input
                  type="text"
                  value={slipNumber}
                  onChange={(e) => setSlipNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-bold text-charcoal focus:outline-none focus:border-amber-600 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  Gross Weight Recorded (Tonnes)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-bold text-charcoal focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-center">
                <Scale className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <span className="font-bold text-charcoal block">Certified Digital Slip Attached</span>
                <span className="text-[10px] text-charcoal-muted">WB_Slip_Sangrur_{proofModalOrder.id}.pdf (Ready for verification)</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProofModalOrder(null)}
                  className="px-4 py-2 text-charcoal-muted font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-subtle"
                >
                  Confirm & Submit Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
