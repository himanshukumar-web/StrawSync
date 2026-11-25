'use client';

import React, { useState } from 'react';
import { Wheat, ArrowRight, X } from 'lucide-react';
import { StrawSyncStore, pricePerUnitToPerTonne } from '../lib/store';
import { CROP_COEFFICIENTS } from '../lib/engine';
import ResidueListingFields, {
  ResidueFormState,
  createInitialResidueState,
} from './ResidueListingFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddResidueModal({ isOpen, onClose, onSuccess }: Props) {
  const [formState, setFormState] = useState<ResidueFormState>(() =>
    createInitialResidueState()
  );
  const [harvestDate, setHarvestDate] = useState<string>('2026-11-20');
  const [collectionStart, setCollectionStart] = useState<string>('2026-11-22');
  const [collectionEnd, setCollectionEnd] = useState<string>('2026-12-10');
  const [village, setVillage] = useState<string>('Dhuri Khurd');
  const [district, setDistrict] = useState<string>('Sangrur');
  const [state, setState] = useState<string>('Punjab');
  const [notes, setNotes] = useState<string>(
    'High-density square baled lot stored on high ground beside link road.'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const coeff = CROP_COEFFICIENTS[formState.cropType] || CROP_COEFFICIENTS.paddy;
    StrawSyncStore.addListing({
      cropType: formState.cropType,
      customCropName: formState.customCropName.trim() || undefined,
      category: coeff.category,
      landAreaAcres: formState.landAreaAcres,
      directQuantity: formState.quantity,
      weightUnit: formState.weightUnit,
      pricePerUnit: formState.pricePerUnit,
      expectedPricePerTonne: pricePerUnitToPerTonne(
        formState.pricePerUnit,
        formState.weightUnit
      ),
      imageUrl: formState.imageUrl || undefined,
      harvestDate,
      collectionStartDate: collectionStart,
      collectionEndDate: collectionEnd,
      baleType: formState.baleType,
      moisturePercentage: formState.moisture,
      village,
      district,
      state,
      notes,
    });
    setFormState(createInitialResidueState());
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-elevated border border-earth-border overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-5 bg-sand-100 border-b border-earth-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest flex items-center justify-center">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Register Crop Residue or Produce Lot
              </h3>
              <p className="text-xs text-charcoal-muted">
                Enter exact quantity in Kg, Quintal, or Tonnes with optional farm photo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-earth-border flex items-center justify-center text-charcoal-muted hover:text-charcoal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <ResidueListingFields value={formState} onChange={setFormState} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Village / Farm Location
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                  District
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
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Harvest / Ready Date
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => {
                  setHarvestDate(e.target.value);
                  setCollectionStart(e.target.value);
                }}
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
              <span>Confirm &amp; Publish Listing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
