'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Calculator,
  ArrowRight,
  Info,
  Sparkles,
  TrendingUp,
  Leaf,
  Coins,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { CropType, BaleType } from '../types';
import { CROP_COEFFICIENTS, estimateResidue } from '../lib/engine';
import { StrawSyncStore } from '../lib/store';

interface Props {
  onClose: () => void;
  onApplyToListing?: (data: {
    cropType: CropType;
    landAreaAcres: number;
    baleType: BaleType;
    estimatedTonnes: number;
    expectedEarnings: number;
  }) => void;
}

export default function ResidueCalculatorModal({ onClose, onApplyToListing }: Props) {
  const router = useRouter();
  const [cropType, setCropType] = useState<CropType>('paddy');
  const [landAreaAcres, setLandAreaAcres] = useState<number>(25);
  const [baleType, setBaleType] = useState<BaleType>('baled');

  const coeff = CROP_COEFFICIENTS[cropType];
  const estimates = estimateResidue(cropType, landAreaAcres, baleType);
  const expectedFairRate = Math.round((coeff.marketBaseRateMin + coeff.marketBaseRateMax) / 2);
  const estimatedRevenue = Math.round(estimates.recoverableTonnes * expectedFairRate);
  const co2PreventedTonnes = Number(
    (estimates.recoverableTonnes * coeff.co2AbatementTonnesPerTonne).toFixed(1)
  );

  const handleApply = () => {
    if (onApplyToListing) {
      onApplyToListing({
        cropType,
        landAreaAcres,
        baleType,
        estimatedTonnes: estimates.recoverableTonnes,
        expectedEarnings: estimatedRevenue,
      });
      onClose();
    } else {
      const currentUser = StrawSyncStore.getCurrentUser();
      onClose();
      if (currentUser && (currentUser.role === 'farmer' || currentUser.role === 'admin')) {
        router.push(`/farmer/listings?crop=${cropType}&acres=${landAreaAcres}&bale=${baleType}`);
      } else {
        router.push('/login');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-elevated border border-earth-border overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-sand-100 border-b border-earth-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest flex items-center justify-center">
              <Calculator className="w-5 h-5 text-forest" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Residue Liquidity Calculator
              </h3>
              <p className="text-xs text-charcoal-muted">
                Rule-based agronomic estimations based on IARI & MNRE benchmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-earth-border flex items-center justify-center text-charcoal-muted hover:text-charcoal transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Crop Select */}
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1.5">
                Target Crop
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value as CropType)}
                className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl text-sm font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="paddy">Paddy Straw (Parali)</option>
                <option value="wheat">Wheat Straw (Bhusa)</option>
                <option value="mustard">Mustard Stalk & Husk</option>
                <option value="sugarcane">Sugarcane Bagasse</option>
                <option value="cotton">Cotton Stalks</option>
                <option value="maize">Maize Stover</option>
              </select>
            </div>

            {/* Land Area */}
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1.5">
                Farmland Area (Acres)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={landAreaAcres}
                  onChange={(e) => setLandAreaAcres(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl text-sm font-semibold text-charcoal focus:outline-none focus:border-forest"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-charcoal-muted">
                  Acres
                </span>
              </div>
            </div>

            {/* Bale Mode */}
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1.5">
                Collection Method
              </label>
              <select
                value={baleType}
                onChange={(e) => setBaleType(e.target.value as BaleType)}
                className="w-full px-3.5 py-2.5 bg-white border border-earth-border rounded-xl text-sm font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="baled">Square/Round Baled (82% Eff.)</option>
                <option value="chopped">Chopped & Mulched (78% Eff.)</option>
                <option value="loose">Loose Field Windrow (72% Eff.)</option>
              </select>
            </div>
          </div>

          {/* Real-time Rule-Based Results Display */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sand rounded-2xl p-4 border border-earth-border">
            <div className="p-3 bg-white rounded-xl border border-earth-border">
              <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                <Scale className="w-3.5 h-3.5 text-forest" />
                <span>Gross Residue</span>
              </div>
              <div className="text-xl font-bold text-charcoal">
                {estimates.grossTonnes}{' '}
                <span className="text-xs font-normal text-charcoal-muted">tonnes</span>
              </div>
              <div className="text-[10px] text-charcoal-muted mt-0.5">
                @{coeff.residueRatioTonnesPerAcre} t/acre
              </div>
            </div>

            <div className="p-3 rounded-xl border border-forest-200 bg-forest-50/30">
              <div className="flex items-center gap-1.5 text-forest-700 text-[11px] font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                <span>Recoverable Biomass</span>
              </div>
              <div className="text-xl font-bold text-forest-700">
                {estimates.recoverableTonnes}{' '}
                <span className="text-xs font-normal text-forest-600">tonnes</span>
              </div>
              <div className="text-[10px] text-forest-600 mt-0.5">
                {Math.round(estimates.assumptions.recoveryFactor * estimates.assumptions.baleEfficiency * 100)}% recovery factor
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-earth-border">
              <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Estimated Value</span>
              </div>
              <div className="text-xl font-bold text-charcoal">
                ₹{estimatedRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-charcoal-muted mt-0.5">
                ~₹{expectedFairRate}/tonne farmgate
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-earth-border">
              <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>CO₂ Prevented</span>
              </div>
              <div className="text-xl font-bold text-emerald-700">
                {co2PreventedTonnes}{' '}
                <span className="text-xs font-normal text-charcoal-muted">tonnes</span>
              </div>
              <div className="text-[10px] text-charcoal-muted mt-0.5">
                Avoids open burning smog
              </div>
            </div>
          </div>

          {/* Model Transparency & Assumptions */}
          <div className="p-3.5 rounded-xl bg-sage/50 border border-forest-100 text-xs text-charcoal-soft space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-forest-800">
              <Info className="w-4 h-4 text-forest" />
              <span>Transparent Model Assumptions & Benchmarks</span>
            </div>
            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Residue-to-crop ratio calibrated to Indian agro-climatic conditions. Gross biomass uses {coeff.residueRatioTonnesPerAcre} t/acre. Net recoverable yield assumes mechanized harvesting with standard straw baler compaction ({baleType === 'baled' ? '98% retention' : '88% loose loss factor'}). Calorific potential is ~{coeff.calorificValueKcalPerKg} kcal/kg with standard {coeff.typicalMoisturePercent}% field moisture.
            </p>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="px-6 py-4 bg-sand border-t border-earth-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-charcoal-muted hover:text-charcoal transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2.5 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest-700 shadow-subtle transition"
          >
            <span>Proceed to List {estimates.recoverableTonnes} Tonnes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
