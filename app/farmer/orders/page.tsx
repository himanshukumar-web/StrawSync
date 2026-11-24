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
  Calendar
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import { PurchaseOrder } from '../../../types';
import { StrawSyncStore } from '../../../lib/store';

export default function FarmerOrdersPage() {
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

  const farmerOrders = orders.filter(
    (o) => o.farmerName.includes(currentUser?.name || 'Gurpreet') || true
  );

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
            Active Stubble Dispatches & Order Tracking
          </h1>
          <p className="text-xs text-charcoal-muted">
            Live status from farmgate pickup to factory weighbridge settlement
          </p>
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

                  <div className="text-right">
                    <div className="text-sm font-bold text-forest">
                      ₹{order.farmerTotalPayout.toLocaleString('en-IN')} Farmer Net Payout
                    </div>
                    <div className="text-[10px] text-charcoal-muted">
                      {order.quantityTonnes}t @ ₹{order.farmgateRate}/t farmgate rate
                    </div>
                  </div>
                </div>

                {/* Tracking Timeline */}
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
