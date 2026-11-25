'use client';

import React, { useEffect, useState } from 'react';
import { Wheat, ArrowRight, X } from 'lucide-react';
import { CalculatorEstimate } from '../types';
import { StrawSyncStore, pricePerUnitToPerTonne, toAcres } from '../lib/store';
import { CROP_COEFFICIENTS } from '../lib/engine';
import { useLanguage } from '../lib/i18n';
import ResidueListingFields, {
  ResidueFormState,
  createInitialResidueState,
} from './ResidueListingFields';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPrefill?: Partial<CalculatorEstimate> | null;
}

function formatIsoDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toISOString().split('T')[0];
}

function parseProfileLocation(location?: string): {
  village: string;
  district: string;
  state: string;
} {
  const parts = (location || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return { village: parts[0], district: parts[1], state: parts.slice(2).join(', ') };
  }
  if (parts.length === 2) {
    return { village: '', district: parts[0], state: parts[1] };
  }
  if (parts.length === 1) {
    return { village: '', district: parts[0], state: '' };
  }
  return { village: '', district: '', state: '' };
}

export default function AddResidueModal({
  isOpen,
  onClose,
  onSuccess,
  initialPrefill = null,
}: Props) {
  const { t } = useLanguage();
  const [formState, setFormState] = useState<ResidueFormState>(() =>
    createInitialResidueState()
  );
  const [harvestDate, setHarvestDate] = useState<string>(() => formatIsoDate(0));
  const [collectionStart, setCollectionStart] = useState<string>(() => formatIsoDate(0));
  const [collectionEnd, setCollectionEnd] = useState<string>(() => formatIsoDate(14));
  const [village, setVillage] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const currentUser = StrawSyncStore.getCurrentUser();
    const loc = parseProfileLocation(currentUser?.location);
    setFormState(createInitialResidueState(null, initialPrefill));
    setVillage(loc.village);
    setDistrict(loc.district);
    setState(loc.state);
    setHarvestDate(formatIsoDate(0));
    setCollectionStart(formatIsoDate(0));
    setCollectionEnd(formatIsoDate(14));
    setNotes('');
    setFormError('');
  }, [isOpen, initialPrefill]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(formState.quantity);
    const price = Number(formState.pricePerUnit);
    if (!qty || qty <= 0) {
      setFormError('Please enter an available quantity greater than zero.');
      return;
    }
    if (!price || price <= 0) {
      setFormError('Please enter an expected farmgate price greater than zero.');
      return;
    }

    const rawLand = Number(formState.landAreaInput) || 0;
    const landAreaAcres = toAcres(rawLand, formState.landAreaUnit);
    const coeff = CROP_COEFFICIENTS[formState.cropType] || CROP_COEFFICIENTS.paddy;
    StrawSyncStore.addListing({
      cropType: formState.cropType,
      customCropName: formState.customCropName.trim() || undefined,
      category: coeff.category,
      landAreaAcres,
      landAreaUnit: formState.landAreaUnit,
      originalLandArea: rawLand,
      directQuantity: qty,
      weightUnit: formState.weightUnit,
      pricePerUnit: price,
      expectedPricePerTonne: pricePerUnitToPerTonne(price, formState.weightUnit),
      imageUrl: formState.imageUrl || undefined,
      harvestDate,
      collectionStartDate: collectionStart,
      collectionEndDate: collectionEnd,
      baleType: formState.baleType,
      moisturePercentage: formState.moisture,
      village: village.trim(),
      district: district.trim(),
      state: state.trim(),
      notes: notes.trim(),
    });
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
                Enter your exact quantity in Kg, Quintal, or Tonnes with optional farm photo
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
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {formError}
            </div>
          )}

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
                placeholder="Enter village / farm location"
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
                  placeholder="Enter district"
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
                  placeholder="Enter state"
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
              {t('modal.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2"
            >
              <span>{t('modal.publishListing', 'Confirm & Publish Listing')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
