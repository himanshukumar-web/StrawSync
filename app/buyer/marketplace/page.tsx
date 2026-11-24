'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  MapPin,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Award
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import { ResidueListing, BuyerDemand, PurchaseOrder } from '../../../types';
import { StrawSyncStore } from '../../../lib/store';

export default function BuyerMarketplacePage() {
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [demands, setDemands] = useState<BuyerDemand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(3000);
  const [maxMoistureFilter, setMaxMoistureFilter] = useState<number>(25);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setListings(StrawSyncStore.getListings());
    setDemands(StrawSyncStore.getDemands());

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setListings(StrawSyncStore.getListings());
      setDemands(StrawSyncStore.getDemands());
    });
    return () => unsubscribe();
  }, []);

  const handleRequestLot = (listing: ResidueListing) => {
    const activeDemand = demands[0] || {
      id: 'dem-instant',
      buyerId: 'user-buyer-1',
      companyName: 'GreenSource Bio-Energy Pellets',
      plantLocation: { district: 'Panipat', state: 'Haryana', coordinates: { lat: 29.3909, lng: 76.9635 } },
      maxDeliveredPricePerTonne: 2400,
    };

    const newOrder = StrawSyncStore.createOrderFromMatch(
      {
        id: `direct-${listing.id}`,
        listingId: listing.id,
        demandId: activeDemand.id,
        listing,
        demand: activeDemand as any,
        matchScore: 88,
        distanceKm: 54,
        recommendedVehicle: {
          type: 'tata_heavy',
          name: 'Tata 22ft 6-Wheeler Heavy Rig',
          capacityTonnes: 15,
          ratePerKm: 48,
          baseLoadingCharge: 2000,
          co2PerKmKg: 0.95,
        },
        estimatedFreightPerTonne: 420,
        farmgatePricePerTonne: listing.expectedPricePerTonne,
        estimatedDeliveredPricePerTonne: listing.expectedPricePerTonne + 420,
        buyerMarginPerTonne: 200,
        totalDeliveredCost: (listing.expectedPricePerTonne + 420) * 30,
        breakdown: { distanceScore: 26, quantityScore: 22, priceViabilityScore: 22, qualityScore: 18, totalScore: 88, reasons: ['Direct marketplace order'] },
        co2SavedKg: 42000,
      },
      Math.min(listing.recoverableTonnes, 30)
    );

    setSuccessMsg(`Order #${newOrder.orderNumber} successfully issued for ${listing.farmerName}'s lot! Escrow secured.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const filteredListings = listings.filter((l) => {
    if (l.status === 'sold') return false;
    if (cropFilter !== 'all' && l.cropType !== cropFilter) return false;
    if (l.expectedPricePerTonne > maxPriceFilter) return false;
    if (l.moisturePercentage > maxMoistureFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.farmerName.toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.village.toLowerCase().includes(q) ||
        l.cropName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <DashboardLayout role="buyer" title="Biomass Marketplace">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/buyer/dashboard"
              className="text-xs font-semibold text-charcoal-muted hover:text-forest flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-bold text-charcoal mt-1">
              Browse Open Market Agricultural Residue
            </h1>
            <p className="text-xs text-charcoal-muted">
              Live farmgate listings verified across Punjab, Haryana, UP & Rajasthan
            </p>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Search by farmer, district, village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
            />
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-earth-border text-xs shadow-subtle">
          <div>
            <label className="block text-[10px] font-bold text-charcoal-muted uppercase mb-1">
              Crop Filter
            </label>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-sand border border-earth-border rounded-lg text-xs font-semibold text-charcoal"
            >
              <option value="all">All Crops (Paddy, Wheat, Mustard...)</option>
              <option value="paddy">Paddy Straw (Parali)</option>
              <option value="wheat">Wheat Straw (Bhusa)</option>
              <option value="mustard">Mustard Stalk & Husk</option>
              <option value="sugarcane">Sugarcane Bagasse</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-charcoal-muted uppercase mb-1">
              Max Farmgate Rate: ₹{maxPriceFilter}/tonne
            </label>
            <input
              type="range"
              min="1000"
              max="3500"
              step="100"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
              className="w-full accent-forest cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-charcoal-muted uppercase mb-1">
              Max Moisture Content: {maxMoistureFilter}%
            </label>
            <input
              type="range"
              min="8"
              max="30"
              step="1"
              value={maxMoistureFilter}
              onChange={(e) => setMaxMoistureFilter(Number(e.target.value))}
              className="w-full accent-forest cursor-pointer"
            />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="p-5 rounded-3xl bg-white border border-earth-border hover:border-forest-300 shadow-subtle transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-forest border border-forest-100">
                    {listing.cropName}
                  </span>
                  <span className="text-sm font-bold text-charcoal">
                    ₹{listing.expectedPricePerTonne}/t
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-charcoal">
                    {listing.farmerName}
                  </h4>
                  <p className="text-xs text-charcoal-muted flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-forest" />
                    <span>{listing.village}, {listing.district} ({listing.state})</span>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-sand border border-earth-border text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-charcoal-muted block">Available Biomass</span>
                    <span className="font-bold text-forest text-sm">{listing.recoverableTonnes} Tonnes</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-muted block">Moisture & Form</span>
                    <span className="font-semibold text-charcoal">{listing.moisturePercentage}% ({listing.baleType})</span>
                  </div>
                </div>

                {listing.notes && (
                  <p className="text-[11px] text-charcoal-muted italic line-clamp-2">
                    "{listing.notes}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-earth-border flex items-center justify-between">
                <span className="text-[11px] text-charcoal-muted">
                  Ready: {listing.collectionStartDate}
                </span>
                <button
                  onClick={() => handleRequestLot(listing)}
                  className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Request Lot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
