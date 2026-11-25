'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ResidueListing, BuyerDemand, PurchaseOrder, Coordinates } from '../types';
import { calculateRoadDistanceKm } from '../lib/engine';

interface MapProps {
  listings?: ResidueListing[];
  demands?: BuyerDemand[];
  orders?: PurchaseOrder[];
  trackedOrder?: PurchaseOrder | null;
  selectedListing?: ResidueListing | null;
  selectedDemand?: BuyerDemand | null;
  onSelectListing?: (listing: ResidueListing) => void;
  onSelectDemand?: (demand: BuyerDemand) => void;
  center?: Coordinates;
  zoom?: number;
  height?: string;
}

export default function MapComponent({
  listings = [],
  demands = [],
  orders = [],
  trackedOrder = null,
  selectedListing,
  selectedDemand,
  onSelectListing,
  onSelectDemand,
  center = { lat: 29.8, lng: 76.5 }, // North India agricultural belt (Punjab/Haryana/West UP)
  zoom = 8,
  height = '480px',
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    // Dynamically load leaflet on client only to avoid SSR issues
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous map instance if exists
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            // ignore
          }
          mapInstanceRef.current = null;
        }

        // Clean up any stale leaflet ID on the container
        if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
          (mapContainerRef.current as any)._leaflet_id = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: zoom,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        if (isMounted) {
          mapInstanceRef.current = map;
          setLeafletLoaded(true);
        } else {
          map.remove();
        }
      } catch (err) {
        console.error('Failed to initialize Leaflet:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when listings, demands, or orders change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || typeof window === 'undefined') return;

    const map = mapInstanceRef.current;
    import('leaflet').then((LModule) => {
      const L = LModule.default;

      // Clear existing non-tile layers
      map.eachLayer((layer: any) => {
        if (!layer._url) {
          map.removeLayer(layer);
        }
      });

      // Custom Farm Icon (Forest Green Pin)
      const createFarmIcon = (crop: string) =>
        L.divIcon({
          className: 'custom-farm-marker',
          html: `
            <div style="background:#245C43; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(36,92,67,0.4); border:2.5px solid #FFFFFF;">
              <span style="font-size:16px;">🌾</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

      // Custom Industrial Plant Icon (Navy Blue Pin)
      const createPlantIcon = () =>
        L.divIcon({
          className: 'custom-plant-marker',
          html: `
            <div style="background:#1E3A8A; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(30,58,138,0.4); border:2.5px solid #FFFFFF;">
              <span style="font-size:16px;">🏭</span>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

      // Add Farmer Listing Markers
      listings.forEach((listing) => {
        if (!listing.coordinates?.lat || !listing.coordinates?.lng) return;

        const marker = L.marker([listing.coordinates.lat, listing.coordinates.lng], {
          icon: createFarmIcon(listing.cropType),
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:200px; padding:4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="background:#E7EFE7; color:#245C43; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                Farmgate Supply
              </span>
              <span style="font-size:11px; color:#748078; font-weight:600;">${listing.village}, ${listing.district}</span>
            </div>
            <div style="font-size:14px; font-weight:bold; color:#202923; margin-bottom:2px;">
              ${listing.cropName}
            </div>
            <div style="font-size:12px; color:#3F795A; font-weight:600; margin-bottom:6px;">
              ${listing.recoverableTonnes} Tonnes Available @ ₹${listing.expectedPricePerTonne}/t
            </div>
            <div style="font-size:11px; color:#555; margin-bottom:8px;">
              Farmer: <strong>${listing.farmerName}</strong><br/>
              Moisture: <strong>${listing.moisturePercentage}% (${listing.baleType})</strong>
            </div>
          </div>
        `);

        if (onSelectListing) {
          marker.on('click', () => onSelectListing(listing));
        }
      });

      // Add Buyer Demand Markers
      demands.forEach((demand) => {
        if (!demand.plantLocation?.coordinates?.lat || !demand.plantLocation?.coordinates?.lng) return;

        const marker = L.marker(
          [demand.plantLocation.coordinates.lat, demand.plantLocation.coordinates.lng],
          { icon: createPlantIcon() }
        ).addTo(map);

        marker.bindPopup(`
          <div style="font-family:sans-serif; min-width:210px; padding:4px;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <span style="background:#DBEAFE; color:#1E3A8A; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase;">
                Biomass Buyer
              </span>
              <span style="font-size:11px; color:#748078; font-weight:600;">${demand.plantLocation.district}</span>
            </div>
            <div style="font-size:14px; font-weight:bold; color:#202923; margin-bottom:2px;">
              ${demand.companyName}
            </div>
            <div style="font-size:12px; color:#1E3A8A; font-weight:600; margin-bottom:6px;">
              Demand: ${Math.max(0, Number((demand.requiredTonnes - demand.fulfilledTonnes).toFixed(1)))} Tonnes ${demand.cropType.toUpperCase()}
            </div>
            <div style="font-size:11px; color:#555; margin-bottom:8px;">
              Industry: <strong>${demand.industryType}</strong><br/>
              Max Ceiling Price: <strong>₹${demand.maxDeliveredPricePerTonne}/t</strong>
            </div>
          </div>
        `);

        if (onSelectDemand) {
          marker.on('click', () => onSelectDemand(demand));
        }
      });

      // Draw Route Lines and Live Truck GPS Markers for Orders
      const boundsPoints: [number, number][] = [];

      const createTruckIcon = (pct: number) =>
        L.divIcon({
          className: 'custom-truck-marker',
          html: `
            <div style="background:#D97706; color:white; padding:4px 8px; border-radius:999px; display:flex; align-items:center; gap:4px; box-shadow:0 4px 12px rgba(217,119,6,0.45); border:2px solid #FFFFFF; font-family:sans-serif; font-size:11px; font-weight:800; white-space:nowrap;">
              <span>🚛</span>
              <span>${pct}%</span>
            </div>
          `,
          iconSize: [64, 28],
          iconAnchor: [32, 14],
        });

      const createOrderEndpointIcon = (emoji: string, bg: string) =>
        L.divIcon({
          className: 'custom-endpoint-marker',
          html: `
            <div style="background:${bg}; color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.28); border:2px solid #FFFFFF;">
              <span style="font-size:14px;">${emoji}</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

      const ordersToRender = trackedOrder
        ? [trackedOrder, ...orders.filter((o) => o.id !== trackedOrder.id)]
        : orders;

      ordersToRender.forEach((order) => {
        const pickupLat = order.pickupCoords?.[0] ?? order.pickupLocation?.lat;
        const pickupLng = order.pickupCoords?.[1] ?? order.pickupLocation?.lng;
        const dropLat = order.dropCoords?.[0] ?? order.deliveryLocation?.lat;
        const dropLng = order.dropCoords?.[1] ?? order.deliveryLocation?.lng;

        if (!pickupLat || !pickupLng || !dropLat || !dropLng) return;

        const pickup: [number, number] = [pickupLat, pickupLng];
        const drop: [number, number] = [dropLat, dropLng];
        const truckPos: [number, number] = order.currentTruckCoords || pickup;
        const pct = Math.min(100, Math.max(0, order.gpsProgressPercent ?? 0));
        const isPrimaryTracked = trackedOrder?.id === order.id;

        if (isPrimaryTracked) {
          boundsPoints.push(pickup, drop, truckPos);

          L.marker(pickup, { icon: createOrderEndpointIcon('🌾', '#245C43') })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:sans-serif; font-size:12px;">
                <strong>Pickup Farmgate</strong><br/>
                ${order.pickupLocation.village}, ${order.pickupLocation.district}<br/>
                Farmer: ${order.farmerName}
              </div>`
            );

          L.marker(drop, { icon: createOrderEndpointIcon('🏭', '#1E3A8A') })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:sans-serif; font-size:12px;">
                <strong>Buyer Delivery Facility</strong><br/>
                ${order.deliveryLocation.facility}<br/>
                Buyer: ${order.buyerName}
              </div>`
            );
        }

        if (pct > 0) {
          L.polyline([pickup, truckPos], {
            color: '#245C43',
            weight: isPrimaryTracked ? 4.5 : 3.5,
            opacity: 0.95,
          }).addTo(map);
        }

        const polyline = L.polyline([truckPos, drop], {
          color: '#3F795A',
          weight: isPrimaryTracked ? 3.5 : 3,
          dashArray: '6, 8',
          opacity: 0.85,
        }).addTo(map);

        polyline.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px;">
            <strong>Corridor: ${order.orderNumber}</strong><br/>
            ${order.quantityTonnes} tonnes ${order.cropType} (${order.distanceKm} km)<br/>
            Status: <span style="text-transform:capitalize; font-weight:bold; color:#245C43;">${order.status.replace(/_/g, ' ')}</span>
          </div>
        `);

        if (isPrimaryTracked || (pct > 0 && pct < 100)) {
          const remainingKm = Math.max(
            0,
            Math.round(
              calculateRoadDistanceKm(
                { lat: truckPos[0], lng: truckPos[1] },
                { lat: drop[0], lng: drop[1] }
              )
            )
          );
          const etaMins = Math.max(5, Math.round((remainingKm / 42) * 60));
          const pingLabel = order.lastGpsUpdatedAt
            ? new Date(order.lastGpsUpdatedAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Standby';

          const truckMarker = L.marker(truckPos, {
            icon: createTruckIcon(pct),
          }).addTo(map);

          truckMarker.bindPopup(`
            <div style="font-family:sans-serif; min-width:210px; font-size:12px; line-height:1.45;">
              <strong style="color:#B45309;">Live Truck GPS • #${order.orderNumber}</strong><br/>
              Vehicle: <strong>${order.vehicleNumber || order.vehicleType}</strong><br/>
              Driver: ${order.driverName || 'Assigned Hauler'}<br/>
              GPS: ${truckPos[0].toFixed(4)}°N, ${truckPos[1].toFixed(4)}°E<br/>
              Remaining: <strong>${remainingKm} km</strong> (~${etaMins} min ETA)<br/>
              Last Ping: ${pingLabel}
            </div>
          `);

          if (isPrimaryTracked && pct > 0) {
            truckMarker.openPopup();
          }
        }
      });

      if (boundsPoints.length >= 2) {
        map.fitBounds(L.latLngBounds(boundsPoints), {
          padding: [36, 36],
          maxZoom: 12,
        });
      }
    });
  }, [listings, demands, orders, trackedOrder, leafletLoaded, onSelectListing, onSelectDemand]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-earth-border shadow-card bg-sand">
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Floating Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-earth-border shadow-subtle text-xs space-y-1.5 pointer-events-auto">
        {trackedOrder ? (
          <>
            <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Live GPS Corridor #{trackedOrder.orderNumber}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-forest border border-white"></div>
              <span className="text-charcoal font-medium">
                Pickup: {trackedOrder.pickupLocation.village}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-600 border border-white"></div>
              <span className="text-charcoal font-medium">
                Live Truck ({trackedOrder.gpsProgressPercent ?? 0}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-800 border border-white"></div>
              <span className="text-charcoal font-medium">
                Buyer: {trackedOrder.deliveryLocation.facility}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
              Active Agricultural Map
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-forest border border-white"></div>
              <span className="text-charcoal font-medium">Farmgate Residue ({listings.length} Lots)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-800 border border-white"></div>
              <span className="text-charcoal font-medium">Bio-Plants &amp; Buyers ({demands.length} Facilities)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 border-t-2 border-dashed border-moss"></div>
              <span className="text-charcoal font-medium">Active Haulage Route ({orders.length} Dispatches)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
