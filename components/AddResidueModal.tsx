'use client';

import React, { useState } from 'react';
import {
  Wheat,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { CropType, BaleType } from '../types';
import { StrawSyncStore } from '../lib/store';
import { CROP_COEFFICIENTS, estimateResidue } from '../lib/engine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddResidueModal({ isOpen, onClose, onSuccess }: Props) {
  const [cropType, setCropType] = useState<CropType>('paddy');
  const [landAreaAcres, setLandAreaAcres] = useState<number>(20);
  const [baleType, setBaleType] = useState<BaleType>('baled');
  const [expectedPrice, setExpectedPrice] = useState<number>(1700);
  const [harvestDate, setHarvestDate] = useState<string>('2026-11-20');
  const [collectionStart, setCollectionStart] = useState<string>('2026-11-22');
  const [collectionEnd, setCollectionEnd] = useState<string>('2026-12-10');
  const [village, setVillage] = useState<string>('Dhuri Khurd');
  const [district, setDistrict] = useState<string>('Sangrur');
  const [state, setState] = useState<string>('Punjab');
  const [moisture, setMoisture] = useState<number>(13.5);
  const [notes, setNotes] = useState<string>('High-density square baled parali stored on high ground.');

  if (!isOpen) return null;

  const coeff = CROP_COEFFICIENTS[cropType];
  const estimates = estimateResidue(cropType, landAreaAcres, baleType);
  const estimatedRevenue = Math.round(estimates.recoverableTonnes * expectedPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StrawSyncStore.addListing({
      cropType,
      landAreaAcres,
      expectedPricePerTonne: expectedPrice,
      harvestDate,
      collectionStartDate: collectionStart,
      collectionEndDate: collectionEnd,
      baleType,
      moisturePercentage: moisture,
      village,
      district,
      state,
      notes,
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-elevated border border-earth-border overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-sand-100 border-b border-earth-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest flex items-center justify-center">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Register New Residue Listing
              </h3>
              <p className="text-xs text-charcoal-muted">
                Automated yield computation and instant buyer visibility
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-earth-border flex items-center justify-center text-charcoal-muted hover:text-charcoal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Crop Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value as CropType)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="paddy">Paddy Straw (Parali)</option>
                <option value="wheat">Wheat Straw (Bhusa)</option>
                <option value="mustard">Mustard Stalk & Husk</option>
                <option value="sugarcane">Sugarcane Bagasse</option>
                <option value="cotton">Cotton Stalks</option>
                <option value="maize">Maize Stover</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Farmland Area (Acres)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={landAreaAcres}
                onChange={(e) => setLandAreaAcres(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Collection / Baling Form
              </label>
              <select
                value={baleType}
                onChange={(e) => setBaleType(e.target.value as BaleType)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="baled">Square / Round Baled (Recommended)</option>
                <option value="chopped">Chopped & Mulched</option>
                <option value="loose">Loose Field Straw</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Expected Farmgate Price (₹/tonne)
              </label>
              <input
                type="number"
                step="50"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Village & District
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village Name"
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                District & State
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District"
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Harvest Date
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Pickup Deadline
              </label>
              <input
                type="date"
                value={collectionEnd}
                onChange={(e) => setCollectionEnd(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>
          </div>

          {/* Dynamic Engine Estimate Preview */}
          <div className="p-4 rounded-2xl bg-forest-50/50 border border-forest-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-forest-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-forest" />
                Liquidity Engine Real-Time Computation
              </span>
              <span>Rule-Based Agronomic Model</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-white border border-forest-100">
                <span className="text-[10px] text-charcoal-muted block">Gross Residue</span>
                <span className="text-sm font-bold text-charcoal">{estimates.grossTonnes} t</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-forest-100">
                <span className="text-[10px] text-charcoal-muted block">Recoverable Biomass</span>
                <span className="text-sm font-bold text-forest">{estimates.recoverableTonnes} t</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-forest-100">
                <span className="text-[10px] text-charcoal-muted block">Farmer Payout</span>
                <span className="text-sm font-bold text-forest">₹{estimatedRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Pickup Instructions / Road Accessibility
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stored beside link road. Suitable for 6-wheeler trucks."
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-earth-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-charcoal-muted hover:text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2"
            >
              <span>Confirm & Publish Listing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
