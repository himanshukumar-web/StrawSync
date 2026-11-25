'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Truck,
  ArrowLeft,
  Scale,
  ShieldCheck,
  Calendar,
  Navigation
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import LiveOrderGpsTracker from '../../../components/LiveOrderGpsTracker';
import { PurchaseOrder, UserProfile } from '../../../types';
import { StrawSyncStore, formatWeight } from '../../../lib/store';

export default function FarmerOrdersPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [expandedGpsOrderId, setExpandedGpsOrderId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    setOrders(StrawSyncStore.getOrders());

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setOrders(StrawSyncStore.getOrders());
    });
    return () => unsubscribe();
  }, []);

  const isAdminView = currentUser?.role === 'admin';
  const farmerOrders = isAdminView
    ? orders
    : currentUser
      ? orders.filter((o) => o.farmerId === currentUser.id)
      : [];
  const pendingRequests = farmerOrders.filter((o) => o.status === 'requested');

  const handleAcceptRequest = (orderId: string, buyerName: string) => {
    StrawSyncStore.acceptPurchaseRequest(orderId);
    setActionMsg(`Accepted purchase request from ${buyerName}. Shipment queued for logistics pickup.`);
    setTimeout(() => setActionMsg(''), 4500);
  };

  const handleRejectRequest = (orderId: string, buyerName: string) => {
    StrawSyncStore.rejectPurchaseRequest(orderId);
    setActionMsg(`Rejected purchase request from ${buyerName}.`);
    setTimeout(() => setActionMsg(''), 4500);
  };

  return (
    <DashboardLayout role="farmer" title="Dispatches & Order Tracking">
      <div className="space-y-6">
        <div>
          <Link
            href="/farmer/dashboard"
            className="text-xs font-semibold text-charcoal-muted hover:text-forest flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-charcoal mt-1">
            {isAdminView ? 'All Farmer Dispatches & Purchase Approvals' : 'Active Stubble Dispatches & Order Tracking'}
          </h1>
          <p className="text-xs text-charcoal-muted">
            Review incoming buyer requests and track live farmgate-to-factory weighbridge milestones
          </p>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Incoming Buyer Purchase Requests */}
        <div className="bg-emerald-50/40 rounded-3xl p-6 border border-forest-200 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-forest-900">
              Incoming Purchase Requests from Buyers ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white border border-earth-border text-xs text-charcoal-muted text-center">
              No pending purchase requests awaiting your confirmation.
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
                      <span className="block text-[11px] text-charcoal-muted">Order #{req.orderNumber}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      Pending Farmer Action
                    </span>
                  </div>
                  <div className="text-xs text-charcoal-soft">
                    <strong>
                      {formatWeight(req.displayQuantity ?? req.quantityTonnes, req.weightUnit)}
                    </strong>{' '}
                    ({req.quantityTonnes}t) {req.cropType.toUpperCase()} • ₹{req.farmgateRate}/t • Total Payout{' '}
                    <strong className="text-forest">₹{req.farmerTotalPayout.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
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
              ))}
            </div>
          )}
        </div>

        {farmerOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-earth-border shadow-subtle space-y-2">
            <Clock className="w-8 h-8 text-charcoal-muted mx-auto" />
            <h3 className="text-base font-bold text-charcoal">No active dispatches</h3>
            <p className="text-xs text-charcoal-muted">
              Once an industrial bio-pellet or power plant confirms a purchase order, live transit tracking will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {farmerOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-earth-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal">
                        Order #{order.orderNumber}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-muted mt-1">
                      Destination: <strong>{order.buyerName}</strong> • {order.distanceKm} km away • {order.vehicleType}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold text-forest">
                      ₹{order.farmerTotalPayout.toLocaleString('en-IN')} Farmer Net Payout
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      {formatWeight(order.displayQuantity ?? order.quantityTonnes, order.weightUnit)} ({order.quantityTonnes}t) @ ₹{order.farmgateRate}/t farmgate rate
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        order.paymentStatus === 'settled'
                          ? 'bg-emerald-50 text-forest border-forest-200'
                          : order.status === 'delivered'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-sand text-charcoal-muted border-earth-border'
                      }`}>
                        {order.paymentStatus === 'settled'
                          ? 'Payment Settled'
                          : order.status === 'delivered'
                            ? 'Escrow Pending Release'
                            : order.status === 'cancelled'
                              ? 'Cancelled'
                              : 'Escrow Locked'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGpsOrderId((prev) =>
                            prev === order.id ? null : order.id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest border border-forest-200 text-[10px] font-bold transition"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>
                          {expandedGpsOrderId === order.id ? 'Hide GPS Map' : 'Track Live GPS'} ({order.gpsProgressPercent ?? 0}%)
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {expandedGpsOrderId === order.id && (
                  <LiveOrderGpsTracker order={order} />
                )}

                {/* Delivery & Settlement Timestamps Strip */}
                {(order.deliveredAt || order.buyerConfirmedAt || order.utrNumber) && (
                  <div className="px-3.5 py-2.5 rounded-2xl bg-sage/60 border border-forest-100 text-[11px] text-charcoal-soft flex flex-wrap items-center justify-between gap-2">
                    <div className="space-x-3">
                      {order.deliveredAt && (
                        <span>
                          Delivered at <strong>{new Date(order.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                          {order.weighbridgeSlipId && <> (Slip <strong>#{order.weighbridgeSlipId}</strong>)</>}
                        </span>
                      )}
                      {order.buyerConfirmedAt && (
                        <span>
                          • Confirmed by Buyer at <strong>{new Date(order.buyerConfirmedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                        </span>
                      )}
                    </div>
                    {order.utrNumber && (
                      <span className="font-bold text-forest">
                        Paid via {order.paymentMethod || 'UPI'} {order.settledPayoutTarget ? `(${order.settledPayoutTarget}) ` : ''}• UTR: <span className="font-mono">{order.utrNumber}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* 4-Step Delivery & Escrow Settlement Tracker */}
                {(() => {
                  const acceptedDone = order.status !== 'requested' && order.status !== 'cancelled';
                  const pickedUpDone = [
                    'logistics_assigned',
                    'pickup_en_route',
                    'loaded_and_weighed',
                    'in_transit',
                    'delivered',
                    'settled',
                  ].includes(order.status);
                  const deliveredDone = ['delivered', 'settled'].includes(order.status);
                  const settledDone = order.status === 'settled' || order.paymentStatus === 'settled';

                  const fourSteps = [
                    {
                      title: '1. Request Accepted',
                      done: acceptedDone,
                      sub: acceptedDone ? 'Confirmed by Farmer' : order.status === 'cancelled' ? 'Declined' : 'Awaiting approval',
                    },
                    {
                      title: '2. Picked Up by Logistics',
                      done: pickedUpDone,
                      sub: pickedUpDone ? (order.logisticsPartnerName || 'Fleet Dispatched') : 'Pending dispatch',
                    },
                    {
                      title: '3. Delivered at Plant',
                      done: deliveredDone,
                      sub: order.deliveredAt
                        ? new Date(order.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : deliveredDone
                          ? 'Unloaded at facility'
                          : 'In pipeline',
                    },
                    {
                      title: '4. Payment Settled',
                      done: settledDone,
                      sub: settledDone
                        ? `₹${order.farmerTotalPayout.toLocaleString('en-IN')} • ${order.utrNumber || 'Credited'}`
                        : deliveredDone
                          ? 'Escrow Pending Release'
                          : 'Escrow Locked',
                    },
                  ];

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {fourSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-center transition ${
                            step.done
                              ? 'bg-emerald-50 border-forest-200 text-forest'
                              : 'bg-sand border-earth-border text-charcoal-muted'
                          }`}
                        >
                          <div className="w-5 h-5 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-1 border border-current">
                            {step.done ? '✓' : idx + 1}
                          </div>
                          <div className="text-[11px] font-bold leading-tight">{step.title}</div>
                          <div className="text-[10px] mt-1 opacity-85 truncate">{step.sub}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
