'use client';

import React, { useState, useEffect } from 'react';
import { Wheat, Sparkles, ArrowRight, X } from 'lucide-react';
import { ResidueListing, CropType, BaleType } from '../types';
import { StrawSyncStore } from '../lib/store';
import { CROP_COEFFICIENTS, estimateResidue } from '../lib/engine';

interface Props {
  isOpen: boolean;
  listing: ResidueListing | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditResidueModal({ isOpen, listing, onClose, onSuccess }: Props) {
  const [cropType, setCropType] = useState<CropType>('paddy');
  const [landAreaAcres, setLandAreaAcres] = useState<number>(20);
  const [baleType, setBaleType] = useState<BaleType>('baled');
  const [expectedPrice, setExpectedPrice] = useState<number>(1700);
  const [harvestDate, setHarvestDate] = useState<string>('');
  const [collectionStart, setCollectionStart] = useState<string>('');
  const [collectionEnd, setCollectionEnd] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [moisture, setMoisture] = useState<number>(14);
  const [status, setStatus] = useState<ResidueListing['status']>('verified');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (listing) {
      setCropType(listing.cropType);
      setLandAreaAcres(listing.landAreaAcres);
      setBaleType(listing.baleType);
      setExpectedPrice(listing.expectedPricePerTonne);
      setHarvestDate(listing.harvestDate);
      setCollectionStart(listing.collectionStartDate);
      setCollectionEnd(listing.collectionEndDate);
      setVillage(listing.village);
      setDistrict(listing.district);
      setState(listing.state);
      setMoisture(listing.moisturePercentage);
      setStatus(listing.status);
      setNotes(listing.notes || '');
    }
  }, [listing]);

  if (!isOpen || !listing) return null;

  const coeff = CROP_COEFFICIENTS[cropType];
  const estimates = estimateResidue(cropType, landAreaAcres, baleType);
  const estimatedRevenue = Math.round(estimates.recoverableTonnes * expectedPrice);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StrawSyncStore.updateListing(listing.id, {
      cropType,
      cropName: coeff.cropName,
      landAreaAcres,
      estimatedGrossTonnes: estimates.grossTonnes,
      recoverableTonnes: estimates.recoverableTonnes,
      expectedPricePerTonne: expectedPrice,
      harvestDate,
      collectionStartDate: collectionStart,
      collectionEndDate: collectionEnd,
      baleType,
      moisturePercentage: moisture,
      village,
      district,
      state,
      status,
      notes,
    });
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-earth-border shadow-elevated overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 bg-sand border-b border-earth-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-white">
              <Wheat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Edit Residue Lot #{listing.id.slice(-6)}
              </h3>
              <p className="text-xs text-charcoal-muted">
                Update farmgate specifications and expected price
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Liquidity Estimate Box */}
          <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-forest-700 block">Gross Stubble</span>
              <span className="text-base font-extrabold text-charcoal">{estimates.grossTonnes} t</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-forest-700 block">Recoverable</span>
              <span className="text-base font-extrabold text-forest">{estimates.recoverableTonnes} t</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-forest-700 block">Estimated Payout</span>
              <span className="text-base font-extrabold text-forest-800">₹{estimatedRevenue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Crop Residue Type
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value as CropType)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="paddy">Paddy Straw (Parali - Basmati/Non-Basmati)</option>
                <option value="wheat">Wheat Straw (Bhusa)</option>
                <option value="mustard">Mustard Stalk (Raya)</option>
                <option value="sugarcane">Sugarcane Trash</option>
                <option value="cotton">Cotton Stalk</option>
                <option value="maize">Maize Stover</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Land Area (Acres)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={landAreaAcres}
                onChange={(e) => setLandAreaAcres(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Bale Format
              </label>
              <select
                value={baleType}
                onChange={(e) => setBaleType(e.target.value as BaleType)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="baled">Square Baled (High Density)</option>
                <option value="loose">Loose Heap</option>
                <option value="chopped">Chopped / Mulched</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Expected Price (₹/Tonne)
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="50"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="verified">Verified (Active)</option>
                <option value="pending">Pending Inspection</option>
                <option value="matched">Matched (Reserved)</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Village / Tehsil
              </label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Moisture %
              </label>
              <input
                type="number"
                min="5"
                max="30"
                step="0.5"
                value={moisture}
                onChange={(e) => setMoisture(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Field & Collection Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-earth-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-charcoal-muted hover:bg-sand font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl font-bold shadow-subtle flex items-center gap-2"
            >
              <span>Save Changes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
