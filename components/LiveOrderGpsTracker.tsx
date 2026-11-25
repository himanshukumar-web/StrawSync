'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Navigation, Truck, Clock, MapPin } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { calculateRoadDistanceKm } from '../lib/engine';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-2xl bg-sand border border-earth-border flex items-center justify-center text-xs font-semibold text-charcoal-muted">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-forest animate-ping" />
        Loading Live GPS Corridor Map...
      </span>
    </div>
  ),
});

interface Props {
  order: PurchaseOrder;
}

export default function LiveOrderGpsTracker({ order }: Props) {
  const pickup: [number, number] = order.pickupCoords || [
    order.pickupLocation.lat,
    order.pickupLocation.lng,
  ];
  const drop: [number, number] = order.dropCoords || [
    order.deliveryLocation.lat,
    order.deliveryLocation.lng,
  ];
  const truckPos: [number, number] = order.currentTruckCoords || pickup;
  const pct = Math.min(100, Math.max(0, order.gpsProgressPercent ?? 0));

  const remainingKm = Math.max(
    0,
    Math.round(
      calculateRoadDistanceKm(
        { lat: truckPos[0], lng: truckPos[1] },
        { lat: drop[0], lng: drop[1] }
      )
    )
  );
  const etaMins = remainingKm === 0 ? 0 : Math.max(5, Math.round((remainingKm / 42) * 60));
  const etaText =
    remainingKm === 0
      ? 'Arrived at Facility'
      : etaMins >= 60
        ? `~${(etaMins / 60).toFixed(1)} hrs`
        : `~${etaMins} mins`;

  const lastPing = order.lastGpsUpdatedAt
    ? new Date(order.lastGpsUpdatedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Awaiting truck ping';

  return (
    <div className="rounded-2xl border border-forest-200 bg-forest-50/40 p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-white border border-earth-border">
          <span className="text-[10px] text-charcoal-muted uppercase font-bold flex items-center gap-1">
            <Truck className="w-3 h-3 text-amber-600" />
            Vehicle &amp; Hauler
          </span>
          <span className="font-bold text-charcoal block mt-0.5 truncate">
            {order.vehicleNumber || order.vehicleType}
          </span>
          <span className="text-[10px] text-charcoal-muted truncate block">
            {order.driverName || order.logisticsPartnerName || 'Assigned Hauler'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-earth-border">
          <span className="text-[10px] text-charcoal-muted uppercase font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-forest" />
            Live Coordinates
          </span>
          <span className="font-mono font-bold text-charcoal block mt-0.5 text-[11px]">
            {truckPos[0].toFixed(4)}°N, {truckPos[1].toFixed(4)}°E
          </span>
          <span className="text-[10px] text-charcoal-muted block">
            {pct}% route completed
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-earth-border">
          <span className="text-[10px] text-charcoal-muted uppercase font-bold flex items-center gap-1">
            <Navigation className="w-3 h-3 text-blue-700" />
            Remaining &amp; ETA
          </span>
          <span className="font-bold text-charcoal block mt-0.5">
            {remainingKm} km remaining
          </span>
          <span className="text-[10px] text-forest font-semibold block">{etaText}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-earth-border">
          <span className="text-[10px] text-charcoal-muted uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-charcoal-muted" />
            Last GPS Ping
          </span>
          <span className="font-bold text-charcoal block mt-0.5">{lastPing}</span>
          <span className="text-[10px] text-charcoal-muted block">
            {order.pickupLocation.district} → {order.deliveryLocation.district}
          </span>
        </div>
      </div>

      <MapComponent trackedOrder={order} orders={[order]} height="300px" />
    </div>
  );
}
