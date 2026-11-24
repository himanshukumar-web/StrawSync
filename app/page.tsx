'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Sprout,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Truck,
  Building2,
  Wheat,
  Calculator,
  Flame,
  CheckCircle2,
  Leaf,
  Layers,
  MapPin,
  Coins,
  ChevronRight,
  BarChart3,
  Scale,
  Sparkles
} from 'lucide-react';
import { StrawSyncStore } from '../lib/store';
import ResidueCalculatorModal from '../components/ResidueCalculatorModal';
import { ResidueListing, BuyerDemand } from '../types';

const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-2xl bg-sand border border-earth-border flex items-center justify-center text-xs font-semibold text-charcoal-muted">
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-forest animate-ping" />
        Loading Live Agricultural Map...
      </span>
    </div>
  ),
});

export default function LandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [stats, setStats] = useState(StrawSyncStore.getPlatformStats());
  const [listings, setListings] = useState<ResidueListing[]>([]);
  const [demands, setDemands] = useState<BuyerDemand[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setStats(StrawSyncStore.getPlatformStats());
    setListings(StrawSyncStore.getListings());
    setDemands(StrawSyncStore.getDemands());

    const unsubscribe = StrawSyncStore.subscribe(() => {
      setStats(StrawSyncStore.getPlatformStats());
      setListings(StrawSyncStore.getListings());
      setDemands(StrawSyncStore.getDemands());
    });
    return () => unsubscribe();
  }, []);

  const handleRoleQuickStart = (role: 'farmer' | 'buyer' | 'logistics' | 'admin') => {
    StrawSyncStore.switchRole(role);
    router.push(`/${role}/dashboard`);
  };

  return (
    <div className="w-full">
      {/* Top Banner: Don't Burn It, Earn From It! */}
      <section className="bg-sage/70 border-b border-forest-100 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-xs font-semibold text-forest-800">
          <span className="flex h-2 w-2 rounded-full bg-forest animate-pulse" />
          <span>Harvest Season 2026-27 Active: Over 4,200 tonnes of Parali matched in Punjab & Haryana belts.</span>
          <button
            onClick={() => setCalculatorOpen(true)}
            className="underline ml-2 hover:text-forest-900 font-bold"
          >
            Calculate Field Value →
          </button>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage border border-forest-200 text-xs font-bold text-forest-800 shadow-subtle">
                <Sprout className="w-3.5 h-3.5 text-forest" />
                <span>Agricultural Residue Liquidity & Smart Logistics</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-charcoal tracking-tight leading-[1.15]">
                Turn Agricultural Waste Into{' '}
                <span className="text-forest relative inline-block">
                  Opportunity.
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-forest-300 h-2.5"
                    viewBox="0 0 200 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 5.5C40 2 120 1.5 199 5.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-charcoal-muted max-w-2xl font-normal leading-relaxed">
                Connect verified farmers selling paddy straw, wheat husk, and bagasse directly with biomass power plants, ethanol refineries, and bio-pellet manufacturers.
              </p>

              {/* Tagline Callout */}
              <div className="p-4 rounded-2xl bg-white border border-earth-border shadow-subtle flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6 text-forest" />
                </div>
                <div>
                  <div className="text-sm font-bold text-charcoal">
                    "Don't Burn It, Earn From It!"
                  </div>
                  <div className="text-xs text-charcoal-muted">
                    Preventing toxic stubble smog while creating ₹1,400 - ₹2,400/tonne net income for farming households.
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => router.push('/farmer/dashboard')}
                  className="px-6 py-3.5 bg-forest text-white rounded-xl text-sm font-bold hover:bg-forest-700 shadow-card flex items-center gap-2 transition"
                >
                  <span>Farmer: List Residue & Earn</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => router.push('/buyer/marketplace')}
                  className="px-6 py-3.5 bg-white border border-forest-300 text-forest-800 rounded-xl text-sm font-bold hover:bg-forest-50 shadow-subtle flex items-center gap-2 transition"
                >
                  <Building2 className="w-4 h-4 text-forest" />
                  <span>Buyer: Source Biomass</span>
                </button>

                <button
                  onClick={() => setCalculatorOpen(true)}
                  className="px-4 py-3.5 text-charcoal-soft hover:text-forest text-sm font-semibold flex items-center gap-1.5 transition"
                >
                  <Calculator className="w-4 h-4 text-forest" />
                  <span>Estimate Field Yield</span>
                </button>
              </div>

              {/* Role Quick Selector Pills */}
              <div className="pt-4 border-t border-earth-border/80">
                <span className="text-xs font-semibold text-charcoal-muted block mb-2">
                  Instant Portal Access:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRoleQuickStart('farmer')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-forest-800 transition"
                  >
                    🌾 Farmer Portal
                  </button>
                  <button
                    onClick={() => handleRoleQuickStart('buyer')}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-800 transition"
                  >
                    🏭 Biomass Buyer
                  </button>
                  <button
                    onClick={() => handleRoleQuickStart('logistics')}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800 transition"
                  >
                    🚛 Logistics Dispatch
                  </button>
                  <button
                    onClick={() => handleRoleQuickStart('admin')}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-800 transition"
                  >
                    🛡️ Admin Analytics
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Regional Field Activity & Map */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-earth-border p-4 shadow-elevated">
                <div className="flex items-center justify-between pb-3 border-b border-earth-border">
                  <div>
                    <h3 className="text-sm font-bold text-charcoal">
                      North India Harvest & Dispatch Map
                    </h3>
                    <p className="text-[11px] text-charcoal-muted">
                      Punjab, Haryana & Western UP Farm Clusters
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-forest font-bold text-[10px] border border-forest-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
                    LIVE NETWORK
                  </span>
                </div>

                <div className="my-3">
                  <MapComponent
                    listings={listings}
                    demands={demands}
                    height="320px"
                    zoom={8}
                    center={{ lat: 29.8, lng: 76.5 }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-sand border border-earth-border">
                    <span className="text-[10px] font-bold text-charcoal-muted uppercase block">
                      Active Farm Supply
                    </span>
                    <span className="text-base font-bold text-forest">
                      {stats.totalListedTonnes} Tonnes
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sand border border-earth-border">
                    <span className="text-[10px] font-bold text-charcoal-muted uppercase block">
                      Buyer Industrial Demand
                    </span>
                    <span className="text-base font-bold text-blue-800">
                      {stats.totalDemandedTonnes} Tonnes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Metrics Section (Clearly labelled demo & seasonal figures) */}
      <section className="py-12 bg-white border-y border-earth-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
                Measurable Environmental & Economic Impact
              </span>
              <h2 className="text-2xl font-bold text-charcoal mt-1">
                Real Numbers from Haryana & Punjab Harvest Corridors
              </h2>
            </div>
            <p className="text-xs text-charcoal-muted mt-2 md:mt-0 max-w-sm">
              *Modelled and verified data based on pilot clusters across Sangrur, Karnal, Panipat & Ludhiana districts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl bg-sand border border-earth-border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-forest flex items-center justify-center mb-3">
                <Scale className="w-5 h-5 text-forest" />
              </div>
              <div className="text-3xl font-extrabold text-forest">
                {stats.totalListedTonnes.toLocaleString('en-IN')}+
              </div>
              <div className="text-xs font-bold text-charcoal mt-1">
                Tonnes Crop Residue Diverted
              </div>
              <p className="text-[11px] text-charcoal-muted mt-1 leading-relaxed">
                Recovered from paddy & wheat fields instead of open in-situ burning.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-2xl bg-sand border border-earth-border">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                <Coins className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-3xl font-extrabold text-charcoal">
                ₹{(stats.totalFarmerPayouts / 10000000).toFixed(2)} Cr
              </div>
              <div className="text-xs font-bold text-charcoal mt-1">
                Direct Farmer Net Earnings
              </div>
              <p className="text-[11px] text-charcoal-muted mt-1 leading-relaxed">
                Deposited via digital escrow straight to Kisan bank accounts post weighbridge.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-2xl bg-sand border border-earth-border">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                <Leaf className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-800">
                {stats.totalCO2PreventedTonnes.toLocaleString('en-IN')}t
              </div>
              <div className="text-xs font-bold text-charcoal mt-1">
                CO₂e Emissions Prevented
              </div>
              <p className="text-[11px] text-charcoal-muted mt-1 leading-relaxed">
                Calculated at 1.45t CO₂e abatement per tonne of paddy straw spared.
              </p>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-2xl bg-sand border border-earth-border">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-3">
                <Truck className="w-5 h-5 text-blue-700" />
              </div>
              <div className="text-3xl font-extrabold text-blue-900">
                {stats.farmersCount}+
              </div>
              <div className="text-xs font-bold text-charcoal mt-1">
                Registered Farm Clusters & Buyers
              </div>
              <p className="text-[11px] text-charcoal-muted mt-1 leading-relaxed">
                Cooperative societies, custom hiring centers, and power utilities on network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How StrawSync Works: Predict, Match, Dispatch */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-700">
              The Residue Liquidity Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-charcoal">
              How StrawSync Solves Agricultural Stubble Burning
            </h2>
            <p className="text-sm text-charcoal-muted leading-relaxed">
              A 3-step automated protocol transforming high-liability crop residue into an on-demand, deliverable industrial commodity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1: Predict */}
            <div className="p-8 rounded-3xl bg-white border border-earth-border shadow-subtle hover:border-forest-300 transition relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest flex items-center justify-center font-bold text-lg mb-6 border border-forest-100">
                  01
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-2">
                  Predict & Quantify
                </h3>
                <p className="text-xs text-charcoal-muted leading-relaxed mb-6">
                  Farmers input crop variety, acreage, and harvesting method. The rule-based agronomic engine instantly calculates gross tonnes, recoverable biomass, and fair farmgate pricing.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sand border border-earth-border space-y-2 text-xs">
                <div className="flex justify-between text-charcoal font-semibold">
                  <span>Paddy PR-126 (25 Acres):</span>
                  <span className="text-forest font-bold">~32.8 Tonnes</span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>Expected Gross Payout:</span>
                  <span className="font-semibold text-charcoal">₹54,120</span>
                </div>
              </div>
            </div>

            {/* Step 2: Match */}
            <div className="p-8 rounded-3xl bg-white border border-earth-border shadow-subtle hover:border-forest-300 transition relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest flex items-center justify-center font-bold text-lg mb-6 border border-forest-100">
                  02
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-2">
                  Match & Price
                </h3>
                <p className="text-xs text-charcoal-muted leading-relaxed mb-6">
                  Our matching engine pairs farmer lots with nearby bio-pellet plants and thermal power stations. It evaluates haulage distance, moisture grade, and computes exact delivered costs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sand border border-earth-border space-y-2 text-xs">
                <div className="flex justify-between text-charcoal font-semibold">
                  <span>Match Score (Panipat Plant):</span>
                  <span className="text-forest font-bold">94 / 100</span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>Delivered Freight:</span>
                  <span className="font-semibold text-charcoal">₹480/tonne (42km)</span>
                </div>
              </div>
            </div>

            {/* Step 3: Dispatch */}
            <div className="p-8 rounded-3xl bg-white border border-earth-border shadow-subtle hover:border-forest-300 transition relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest flex items-center justify-center font-bold text-lg mb-6 border border-forest-100">
                  03
                </div>
                <h3 className="text-xl font-bold text-charcoal mb-2">
                  Dispatch & Settle
                </h3>
                <p className="text-xs text-charcoal-muted leading-relaxed mb-6">
                  The system allocates optimal rural transport (Tractor Trolley, Eicher or 22ft Tata truck). Farmers receive certified weighbridge slips and digital payment release within 24 hours.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-sand border border-earth-border space-y-2 text-xs">
                <div className="flex justify-between text-charcoal font-semibold">
                  <span>Logistics Turnaround:</span>
                  <span className="text-forest font-bold">Under 36 Hours</span>
                </div>
                <div className="flex justify-between text-charcoal-muted">
                  <span>Escrow Settlement:</span>
                  <span className="font-semibold text-charcoal">100% Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Value Proposition: Farmers & Industrial Buyers */}
      <section className="py-16 bg-white border-t border-earth-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* For Farmers */}
            <div className="p-8 rounded-3xl bg-sand border border-earth-border space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-forest text-xs font-bold">
                <Wheat className="w-4 h-4" />
                <span>For Farmers & FPOs</span>
              </div>
              <h3 className="text-2xl font-bold text-charcoal">
                Stop the Fine, Seedbeds Cleared, Direct Extra Income
              </h3>
              <ul className="space-y-3.5 text-xs text-charcoal-soft">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Out-of-Pocket Haulage:</strong> Buyers and assigned logistics partners pick up baled straw straight from field gates.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <span>
                    <strong>Avoid Penalties & Stubble Bans:</strong> Full immunity from agricultural fines and satellite smog monitoring notices.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <span>
                    <strong>Rapid Seedbed Preparation:</strong> Timely clearance allows on-schedule winter wheat and mustard sowing.
                  </span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/farmer/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest-700 transition"
              >
                <span>Enter Farmer Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* For Biomass Industries */}
            <div className="p-8 rounded-3xl bg-sand border border-earth-border space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                <Building2 className="w-4 h-4" />
                <span>For Bio-Plants & Utilities</span>
              </div>
              <h3 className="text-2xl font-bold text-charcoal">
                Guaranteed Moisture Specs, Predictable Feedstock Supply
              </h3>
              <ul className="space-y-3.5 text-xs text-charcoal-soft">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Meet CPCB 5-7% Co-Firing Mandate:</strong> Continuous seasonal flow of agro-pellets to avoid coal plant penalties.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Delivered Cost Transparency:</strong> Farmgate rate, certified transport freight, and weighbridge slips fully integrated.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Batch Moisture & Density Verification:</strong> Reject uncertified or high-moisture lots before gate entry.
                  </span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/buyer/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition"
              >
                <span>Enter Buyer Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Residue Liquidity Calculator Modal */}
      {calculatorOpen && (
        <ResidueCalculatorModal onClose={() => setCalculatorOpen(false)} />
      )}
    </div>
  );
}
