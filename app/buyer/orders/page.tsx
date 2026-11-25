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
  Building2,
  Navigation
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import LiveOrderGpsTracker from '../../../components/LiveOrderGpsTracker';
import { PurchaseOrder, UserProfile } from '../../../types';
import { StrawSyncStore, formatWeight } from '../../../lib/store';

export default function BuyerOrdersPage() {
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
  const buyerOrders = isAdminView
    ? orders
    : currentUser
      ? orders.filter((o) => o.buyerId === currentUser.id)
      : [];

  const handleConfirmDeliveryAndRelease = (orderId: string) => {
    const res = StrawSyncStore.confirmDeliveryAndReleasePayment(orderId);
    if (!res.success) {
      setActionMsg(res.error);
    } else {
      setActionMsg(
        `Delivery confirmed for #${res.order.orderNumber}! ₹${res.transaction.amount.toLocaleString('en-IN')} credited to ${res.order.farmerName} (${res.transaction.utrNumber}).`
      );
    }
    setTimeout(() => setActionMsg(''), 6000);
  };

  return (
    <DashboardLayout role="buyer" title="Biomass Purchase Orders & Tracking">
      <div className="space-y-6">
        <div>
          <Link
            href="/buyer/dashboard"
            className="text-xs font-semibold text-charcoal-muted hover:text-forest flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-charcoal mt-1">
            {isAdminView ? 'All Platform Procurement Purchase Orders' : 'Procurement Purchase Orders & Inbound Feedstock'}
          </h1>
          <p className="text-xs text-charcoal-muted">
            Live escrow verification, weighbridge tickets, and gate-entry logistics tracking
          </p>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest shrink-0" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {buyerOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-earth-border shadow-subtle space-y-2">
            <Building2 className="w-8 h-8 text-charcoal-muted mx-auto" />
            <h3 className="text-base font-bold text-charcoal">No purchase orders placed yet</h3>
            <p className="text-xs text-charcoal-muted">
              Use the matching engine on your dashboard or browse the open marketplace to issue purchase orders.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {buyerOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-earth-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-charcoal">
                        Purchase Order #{order.orderNumber}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        order.status === 'requested'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status === 'requested'
                          ? 'Pending Farmer Approval'
                          : order.status === 'accepted'
                            ? 'Farmer Accepted • Ready for Logistics'
                            : order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-muted mt-1">
                      Farm Source: <strong>{order.farmerName}</strong> ({order.pickupLocation.village}, {order.pickupLocation.district}) •{' '}
                      Hauler Fleet: {order.vehicleType}
                    </div>
                    {order.cancelledReason && (
                      <div className="text-[11px] font-semibold text-red-700 mt-1">
                        {order.cancelledReason}
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1.5">
                    <div className="text-sm font-bold text-forest">
                      ₹{order.buyerTotalBill.toLocaleString('en-IN')} Total Cost
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      {formatWeight(order.displayQuantity ?? order.quantityTonnes, order.weightUnit)} ({order.quantityTonnes}t) @ ₹{order.totalDeliveredRate}/t delivered
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGpsOrderId((prev) =>
                            prev === order.id ? null : order.id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>
                          {expandedGpsOrderId === order.id ? 'Hide GPS Map' : 'Track Live GPS'} ({order.gpsProgressPercent ?? 0}%)
                        </span>
                      </button>
                      {order.status === 'delivered' && order.paymentStatus !== 'settled' && (
                        <button
                          onClick={() => handleConfirmDeliveryAndRelease(order.id)}
                          className="px-4 py-2 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle transition inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm Delivery &amp; Release Payment</span>
                        </button>
                      )}
                      {order.paymentStatus === 'settled' && order.utrNumber && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-forest-200 text-[10px] font-bold text-forest">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled • {order.utrNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {expandedGpsOrderId === order.id && (
                  <LiveOrderGpsTracker order={order} />
                )}

                {(order.deliveredAt || order.weighbridgeSlipId) && (
                  <div className="px-3.5 py-2 rounded-xl bg-sage/60 border border-forest-100 text-[11px] text-charcoal-soft flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Delivered at <strong>{new Date(order.deliveredAt || order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                      {order.weighbridgeSlipId && <> • Weighbridge Slip <strong>#{order.weighbridgeSlipId}</strong> ({order.weighbridgeNetTonnes || order.quantityTonnes}t)</>}
                    </span>
                    <span className="font-bold text-forest">
                      Farmer Escrow: ₹{order.farmerTotalPayout.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Tracking Progress */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1">
                  {order.trackingTimeline.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        step.completed
                          ? 'bg-emerald-50 border-forest-200 text-forest'
                          : 'bg-sand border-earth-border text-charcoal-muted'
                      }`}
                    >
                      <div className="w-5 h-5 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold mb-1 border border-current">
                        {step.completed ? '✓' : idx + 1}
                      </div>
                      <div className="text-[10px] font-bold leading-tight line-clamp-2">
                        {step.step}
                      </div>
                      <div className="text-[9px] mt-1 opacity-75 truncate">
                        {step.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
