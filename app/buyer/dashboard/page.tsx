'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Scale,
  Truck,
  Sparkles,
  Award,
  Info,
  Clock,
  ShoppingBag
} from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import AddDemandModal from '../../../components/AddDemandModal';
import { ResidueListing, BuyerDemand, PurchaseOrder, MatchResult } from '../../../types';
import { StrawSyncStore } from '../../../lib/store';
import { findMatchesForDemand } from '../../../lib/engine';

export default function BuyerDashboardPage() {
  const [currentUser, setCurrentUser] = useState(StrawSyncStore.getCurrentUser());
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [demands, setDemands] = useState<BuyerDemand[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedDemandId, setSelectedDemandId] = useState<string>('');
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string>('');

  useEffect(() => {
    setCurrentUser(StrawSyncStore.getCurrentUser());
    setListings(StrawSyncStore.getListings());
    const allDemands = StrawSyncStore.getDemands();
    setDemands(allDemands);
    setOrders(StrawSyncStore.getOrders());
    if (allDemands.length > 0 && !selectedDemandId) {
      setSelectedDemandId(allDemands[0].id);
    }

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setCurrentUser(StrawSyncStore.getCurrentUser());
      setListings(StrawSyncStore.getListings());
      setDemands(StrawSyncStore.getDemands());
      setOrders(StrawSyncStore.getOrders());
    });
    return () => unsubscribe();
  }, [selectedDemandId]);

  const activeDemand = demands.find((d) => d.id === selectedDemandId) || demands[0];
  const matchedResults: MatchResult[] = activeDemand
    ? findMatchesForDemand(activeDemand, listings)
    : [];

  const handleSendPurchaseOrder = (match: MatchResult) => {
    const qty = Math.min(match.listing.recoverableTonnes, 35);
    const newOrder = StrawSyncStore.createOrderFromMatch(match, qty);
    setOrderSuccessMsg(
      `Purchase Order #${newOrder.orderNumber} successfully issued to ${match.listing.farmerName}! Escrow fund allocated.`
    );
    setSelectedMatch(null);
    setTimeout(() => setOrderSuccessMsg(''), 5000);
  };

  const buyerOrders = orders.filter((o) => o.buyerName.includes('GreenSource') || true);

  return (
    <DashboardLayout role="buyer" title="Biomass Buyer Procurement Dashboard">
      <div className="space-y-8">
        {/* Top Header Profile */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-2xl shrink-0">
              🏭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-charcoal">
                  Industrial Procurement — {currentUser?.organization || 'GreenSource Bio-Energy'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                  CPCB Co-Firing Mandate Active
                </span>
              </div>
              <p className="text-xs text-charcoal-muted mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-700" />
                <span>{currentUser?.location || 'Panipat Industrial Sector, Haryana'}</span>
                <span>•</span>
                <span>Buyer Desk: {currentUser?.name || 'Rajesh Mehra'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/buyer/marketplace"
              className="px-4 py-2.5 bg-white border border-earth-border hover:bg-sand text-charcoal rounded-xl text-xs font-bold shadow-subtle flex items-center gap-1.5 transition"
            >
              <ShoppingBag className="w-4 h-4 text-forest" />
              <span>Browse Open Lots</span>
            </Link>

            <button
              onClick={() => setShowDemandModal(true)}
              className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Post Biomass Demand</span>
            </button>
          </div>
        </div>

        {orderSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center justify-between shadow-subtle">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-forest" />
              <span>{orderSuccessMsg}</span>
            </div>
            <button onClick={() => setOrderSuccessMsg('')} className="text-forest hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Active Demands Bar */}
        <div className="bg-white rounded-3xl p-6 border border-earth-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-charcoal">
                Active Procurement Requisitions
              </h2>
              <p className="text-xs text-charcoal-muted">
                Select a demand requisition to calculate real-time match rankings
              </p>
            </div>
            <span className="text-xs font-semibold text-charcoal-muted">
              {demands.length} Active Targets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {demands.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDemandId(d.id)}
                className={`p-4 rounded-2xl border text-left transition ${
                  selectedDemandId === d.id
                    ? 'border-blue-600 bg-blue-50/40 shadow-subtle'
                    : 'border-earth-border bg-sand hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-charcoal mb-1">
                  <span className="uppercase">{d.cropType} Straw</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-earth-border">
                    {d.industryType}
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {d.requiredTonnes - d.fulfilledTonnes}{' '}
                  <span className="text-xs font-normal text-charcoal-muted">tonnes remaining</span>
                </div>
                <div className="text-[11px] text-charcoal-muted mt-1 flex justify-between">
                  <span>Max Ceiling: ₹{d.maxDeliveredPricePerTonne}/t</span>
                  <span>Max Moisture: {d.maxMoisturePercentage}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Matches Spotlight */}
        {activeDemand && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-earth-border shadow-subtle space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-earth-border pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-forest-50 border border-forest-100 text-[10px] font-bold text-forest uppercase mb-1">
                  <Sparkles className="w-3 h-3 text-forest" />
                  Residue Liquidity Matching Engine
                </div>
                <h2 className="text-xl font-bold text-charcoal">
                  Ranked Farmgate Matches for {activeDemand.requiredTonnes}t {activeDemand.cropType.toUpperCase()}
                </h2>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Calculated using rural road distance, vehicle capacity, moisture grade, and delivered freight
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-charcoal-muted block">Budget Ceiling</span>
                <span className="text-lg font-bold text-charcoal">
                  ₹{activeDemand.maxDeliveredPricePerTonne}/t Delivered
                </span>
              </div>
            </div>

            {matchedResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-charcoal-muted">
                No matching farmgate lots found within distance and quality limits. Try browsing the open marketplace.
              </div>
            ) : (
              <div className="space-y-4">
                {matchedResults.map((match) => (
                  <div
                    key={match.id}
                    className="p-5 rounded-2xl border border-earth-border hover:border-forest-300 bg-sand transition space-y-4"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      <div className="lg:col-span-5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 rounded-xl bg-forest text-white text-xs font-bold flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>{match.matchScore} / 100</span>
                          </div>
                          <span className="text-xs font-bold text-charcoal">
                            {match.listing.farmerName}
                          </span>
                          <span className="text-[11px] text-charcoal-muted">
                            ({match.listing.village}, {match.listing.district})
                          </span>
                        </div>

                        <div className="text-xs text-charcoal-soft">
                          <strong>{match.listing.recoverableTonnes} Tonnes</strong> of {match.listing.cropName} •{' '}
                          {match.listing.moisturePercentage}% moisture ({match.listing.baleType})
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-charcoal-muted pt-0.5">
                          <Truck className="w-3.5 h-3.5 text-forest" />
                          <span>Distance: <strong>{match.distanceKm} km</strong></span>
                          <span>•</span>
                          <span>Truck: <strong>{match.recommendedVehicle.name}</strong></span>
                        </div>
                      </div>

                      <div className="lg:col-span-4 p-3 bg-white rounded-xl border border-earth-border text-xs space-y-1">
                        <div className="flex justify-between text-charcoal-muted text-[11px]">
                          <span>Farmgate Rate:</span>
                          <span className="font-semibold text-charcoal">₹{match.farmgatePricePerTonne}/t</span>
                        </div>
                        <div className="flex justify-between text-charcoal-muted text-[11px]">
                          <span>Est. Transport Freight:</span>
                          <span className="font-semibold text-charcoal">₹{match.estimatedFreightPerTonne}/t</span>
                        </div>
                        <div className="border-t border-earth-border pt-1 flex justify-between font-bold text-xs">
                          <span>Total Delivered Cost:</span>
                          <span className="text-forest text-sm">₹{match.estimatedDeliveredPricePerTonne}/t</span>
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold text-right">
                          {match.buyerMarginPerTonne >= 0
                            ? `₹${match.buyerMarginPerTonne}/t under budget`
                            : `₹${Math.abs(match.buyerMarginPerTonne)}/t above ceiling`}
                        </div>
                      </div>

                      <div className="lg:col-span-3 flex flex-col gap-2">
                        <button
                          onClick={() => handleSendPurchaseOrder(match)}
                          className="w-full py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center justify-center gap-1.5 transition"
                        >
                          <span>Send Purchase Request</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                          className="w-full py-1.5 text-center text-[11px] font-semibold text-charcoal-muted hover:text-forest"
                        >
                          {selectedMatch?.id === match.id ? 'Hide Rationale ▲' : 'View Match Breakdown ▼'}
                        </button>
                      </div>
                    </div>

                    {selectedMatch?.id === match.id && (
                      <div className="mt-3 pt-3 border-t border-earth-border bg-white p-4 rounded-xl space-y-2 text-xs">
                        <div className="font-bold text-charcoal flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-forest" />
                          <span>Residue Liquidity Score Breakdown:</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="p-2 bg-sand rounded-lg">
                            <span className="text-charcoal-muted block">Proximity Fit</span>
                            <span className="font-bold text-charcoal">{match.breakdown.distanceScore} / 30 pts</span>
                          </div>
                          <div className="p-2 bg-sand rounded-lg">
                            <span className="text-charcoal-muted block">Quantity Coverage</span>
                            <span className="font-bold text-charcoal">{match.breakdown.quantityScore} / 25 pts</span>
                          </div>
                          <div className="p-2 bg-sand rounded-lg">
                            <span className="text-charcoal-muted block">Delivered Margin</span>
                            <span className="font-bold text-charcoal">{match.breakdown.priceViabilityScore} / 25 pts</span>
                          </div>
                          <div className="p-2 bg-sand rounded-lg">
                            <span className="text-charcoal-muted block">Moisture Quality</span>
                            <span className="font-bold text-charcoal">{match.breakdown.qualityScore} / 20 pts</span>
                          </div>
                        </div>
                        <ul className="list-disc pl-5 text-[11px] text-charcoal-muted space-y-1">
                          {match.breakdown.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddDemandModal
        isOpen={showDemandModal}
        onClose={() => setShowDemandModal(false)}
        onSuccess={(created) => setSelectedDemandId(created.id)}
      />
    </DashboardLayout>
  );
}
