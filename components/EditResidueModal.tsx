'use client';

import React, { useState, useEffect } from 'react';
import { Wheat, ArrowRight, X } from 'lucide-react';
import { ResidueListing } from '../types';
import { StrawSyncStore, toTonnes, pricePerUnitToPerTonne, toAcres } from '../lib/store';
import { CROP_COEFFICIENTS, estimateResidue } from '../lib/engine';
import ResidueListingFields, {
  ResidueFormState,
  createInitialResidueState,
} from './ResidueListingFields';

interface Props {
  isOpen: boolean;
  listing: ResidueListing | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditResidueModal({ isOpen, listing, onClose, onSuccess }: Props) {
  const [formState, setFormState] = useState<ResidueFormState>(() =>
    createInitialResidueState(listing)
  );
  const [harvestDate, setHarvestDate] = useState<string>('');
  const [collectionStart, setCollectionStart] = useState<string>('');
  const [collectionEnd, setCollectionEnd] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [status, setStatus] = useState<ResidueListing['status']>('verified');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (listing) {
      setFormState(createInitialResidueState(listing));
      setHarvestDate(listing.harvestDate);
      setCollectionStart(listing.collectionStartDate);
      setCollectionEnd(listing.collectionEndDate);
      setVillage(listing.village);
      setDistrict(listing.district);
      setState(listing.state);
      setStatus(listing.status);
      setNotes(listing.notes || '');
    }
  }, [listing]);

  if (!isOpen || !listing) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(formState.quantity) || 0;
    const price = Number(formState.pricePerUnit) || 0;
    const rawLand = Number(formState.landAreaInput) || 0;
    const acres = toAcres(rawLand, formState.landAreaUnit);
    const coeff = CROP_COEFFICIENTS[formState.cropType] || CROP_COEFFICIENTS.paddy;
    const recoverableTonnes = toTonnes(qty, formState.weightUnit);
    const expectedPricePerTonne = pricePerUnitToPerTonne(price, formState.weightUnit);
    const estimates =
      acres > 0
        ? estimateResidue(formState.cropType, acres, formState.baleType)
        : null;

    StrawSyncStore.updateListing(listing.id, {
      cropType: formState.cropType,
      cropName: formState.customCropName.trim() || coeff.cropName,
      category: coeff.category,
      landAreaAcres: acres,
      landAreaUnit: formState.landAreaUnit,
      originalLandArea: rawLand,
      estimatedGrossTonnes: estimates
        ? estimates.grossTonnes
        : Number((recoverableTonnes * 1.1).toFixed(2)),
      recoverableTonnes,
      originalQuantity: qty,
      weightUnit: formState.weightUnit,
      pricePerUnit: price,
      expectedPricePerTonne,
      imageUrl: formState.imageUrl || undefined,
      harvestDate,
      collectionStartDate: collectionStart,
      collectionEndDate: collectionEnd,
      baleType: formState.baleType,
      moisturePercentage: formState.moisture,
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
        <div className="p-6 bg-sand border-b border-earth-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-white">
              <Wheat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Edit Listing #{listing.id.slice(-6)}
              </h3>
              <p className="text-xs text-charcoal-muted">
                Update quantity, unit, farmgate price, photo, or location specs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          <ResidueListingFields value={formState} onChange={setFormState} isEdit />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ResidueListing['status'])}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl font-semibold text-charcoal focus:outline-none focus:border-forest"
              >
                <option value="verified">Verified (Active)</option>
                <option value="pending">Pending Inspection</option>
                <option value="matched">Matched (Reserved)</option>
                <option value="sold">Sold</option>
              </select>
            </div>

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
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Field &amp; Collection Notes
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
