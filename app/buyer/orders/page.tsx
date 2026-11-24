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
  Building2
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import { PurchaseOrder } from '../../../types';
import { StrawSyncStore } from '../../../lib/store';

export default function BuyerOrdersPage() {
  const [currentUser, setCurrentUser] = useState(StrawSyncStore.getCurrentUser());
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    setOrders(StrawSyncStore.getOrders());

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setOrders(StrawSyncStore.getOrders());
    });
    return () => unsubscribe();
  }, []);

  const buyerOrders = orders.filter((o) => o.buyerName.includes('GreenSource') || true);

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
            Procurement Purchase Orders & Inbound Feedstock
          </h1>
          <p className="text-xs text-charcoal-muted">
            Live escrow verification, weighbridge tickets, and gate-entry logistics tracking
          </p>
        </div>

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
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-muted mt-1">
                      Farm Source: <strong>{order.farmerName}</strong> ({order.pickupLocation.village}, {order.pickupLocation.district}) •{' '}
                      Hauler Fleet: {order.vehicleType}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-forest">
                      ₹{order.buyerTotalBill.toLocaleString('en-IN')} Total Cost
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      {order.quantityTonnes} tonnes @ ₹{order.totalDeliveredRate}/t delivered
                    </div>
                  </div>
                </div>

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
