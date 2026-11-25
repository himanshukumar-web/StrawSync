'use client';

import React, { useEffect, useState } from 'react';
import { Building2, ArrowRight, X } from 'lucide-react';
import { CropType, BuyerDemand, CalculatorEstimate } from '../types';
import { StrawSyncStore } from '../lib/store';
import { CROP_COEFFICIENTS } from '../lib/engine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: BuyerDemand) => void;
  initialPrefill?: Partial<CalculatorEstimate> | null;
}

export default function AddDemandModal({
  isOpen,
  onClose,
  onSuccess,
  initialPrefill = null,
}: Props) {
  const [newCrop, setNewCrop] = useState<CropType>('paddy');
  const [newTonnes, setNewTonnes] = useState<number>(100);
  const [newMaxPrice, setNewMaxPrice] = useState<number>(2300);
  const [newMaxMoisture, setNewMaxMoisture] = useState<number>(15);
  const [newDeadline, setNewDeadline] = useState<string>('2026-12-30');
  const [newIndustry, setNewIndustry] = useState<BuyerDemand['industryType']>('Bio-Pellet Plant');
  const [newAddress, setNewAddress] = useState<string>('Industrial Area Phase II');
  const [newDistrict, setNewDistrict] = useState<string>('Panipat');
  const [newState, setNewState] = useState<string>('Haryana');

  useEffect(() => {
    if (!isOpen) return;
    const user = StrawSyncStore.getCurrentUser();
    const locParts = (user?.location || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (locParts.length >= 2) {
      setNewDistrict(locParts[locParts.length - 2]);
      setNewState(locParts[locParts.length - 1]);
    } else if (locParts.length === 1) {
      setNewDistrict(locParts[0]);
    }
    if (locParts.length > 0) {
      setNewAddress(user?.location || 'Industrial Plant Gate');
    }

    const deadlineDefault = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setNewDeadline(deadlineDefault);

    if (initialPrefill) {
      const crop = initialPrefill.cropType || 'paddy';
      const coeff = CROP_COEFFICIENTS[crop] || CROP_COEFFICIENTS.paddy;
      setNewCrop(crop);
      setNewTonnes(Math.max(1, Math.round(initialPrefill.quantityTonnes || 50)));
      setNewMaxPrice(
        Math.round(
          initialPrefill.pricePerTonne ||
            (initialPrefill.totalAmount && initialPrefill.quantityTonnes
              ? initialPrefill.totalAmount / initialPrefill.quantityTonnes
              : coeff.marketBaseRateMax)
        )
      );
      setNewMaxMoisture(
        Math.round(initialPrefill.moisturePercent ?? coeff.typicalMoisturePercent)
      );
    }
  }, [isOpen, initialPrefill]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = StrawSyncStore.addDemand({
      cropType: newCrop,
      requiredTonnes: newTonnes,
      maxDeliveredPricePerTonne: newMaxPrice,
      maxMoisturePercentage: newMaxMoisture,
      deadlineDate: newDeadline,
      industryType: newIndustry,
      address: newAddress,
      district: newDistrict,
      state: newState,
    });
    if (onSuccess) onSuccess(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-elevated border border-earth-border overflow-hidden">
        <div className="px-6 py-5 bg-sand-100 border-b border-earth-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal">
                Post Biomass or Produce Demand Request
              </h3>
              <p className="text-xs text-charcoal-muted">
                Notify rural farm clusters and activate the liquidity matching engine
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Biomass / Produce Variety
              </label>
              <select
                value={newCrop}
                onChange={(e) => setNewCrop(e.target.value as CropType)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
              >
                {(Object.keys(CROP_COEFFICIENTS) as CropType[]).map((key) => (
                  <option key={key} value={key}>
                    {CROP_COEFFICIENTS[key].cropName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Required Quantity (Tonnes)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                step="any"
                value={newTonnes}
                onChange={(e) => setNewTonnes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Max Delivered Price Ceiling (₹/t)
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={newMaxPrice}
                onChange={(e) => setNewMaxPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Max Acceptable Moisture %
              </label>
              <input
                type="number"
                min="5"
                max="95"
                value={newMaxMoisture}
                onChange={(e) => setNewMaxMoisture(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Facility Plant District
              </label>
              <input
                type="text"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
                Procurement Deadline
              </label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Industry / Facility Classification
            </label>
            <select
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value as BuyerDemand['industryType'])}
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal"
            >
              <option value="Bio-Pellet Plant">Bio-Pellet &amp; Briquette Plant</option>
              <option value="Ethanol Refinery">2G Bio-Ethanol Refinery</option>
              <option value="Thermal Power Plant">Thermal Power Co-Gen Facility</option>
              <option value="Paper Mill">Agro-Residue Paper Mill</option>
            </select>
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
              className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-subtle flex items-center gap-2"
            >
              <span>Publish Demand Request</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
