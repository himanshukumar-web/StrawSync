'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Sparkles, Trash2, AlertCircle } from 'lucide-react';
import {
  BaleType,
  CalculatorEstimate,
  CropType,
  LandAreaUnit,
  ResidueListing,
  WeightUnit,
} from '../types';
import { CROP_COEFFICIENTS, estimateResidue } from '../lib/engine';
import { fromTonnes, pricePerUnitToPerTonne, toAcres, toTonnes } from '../lib/store';
import { compressProductImage } from '../lib/imageUpload';
import LandAreaField from './LandAreaField';

export interface ResidueFormState {
  cropType: CropType;
  customCropName: string;
  quantity: number | '';
  weightUnit: WeightUnit;
  landAreaInput: string;
  landAreaUnit: LandAreaUnit;
  baleType: BaleType;
  pricePerUnit: number | '';
  moisture: number;
  imageUrl: string;
}

const UNIT_LABELS: Record<WeightUnit, string> = {
  kg: 'Kg',
  quintal: 'Quintal (100 Kg)',
  tonne: 'Tonne (1,000 Kg)',
};

const UNIT_SHORT: Record<WeightUnit, string> = {
  kg: 'Kg',
  quintal: 'Quintal',
  tonne: 'Tonne',
};

export function createInitialResidueState(
  listing?: ResidueListing | null,
  prefill?: Partial<CalculatorEstimate> | null
): ResidueFormState {
  if (listing) {
    const unit: WeightUnit = listing.weightUnit || 'tonne';
    const quantity =
      listing.originalQuantity !== undefined
        ? listing.originalQuantity
        : fromTonnes(listing.recoverableTonnes, unit);
    const factor = unit === 'kg' ? 0.001 : unit === 'quintal' ? 0.1 : 1;
    const pricePerUnit =
      listing.pricePerUnit !== undefined
        ? listing.pricePerUnit
        : Math.round((listing.expectedPricePerTonne || 0) * factor * 100) / 100;
    const defaultName = CROP_COEFFICIENTS[listing.cropType]?.cropName || '';
    const landUnit: LandAreaUnit = listing.landAreaUnit || 'acre';
    const landValue =
      listing.originalLandArea !== undefined
        ? String(listing.originalLandArea)
        : String(listing.landAreaAcres ?? 0);

    return {
      cropType: listing.cropType,
      customCropName:
        listing.cropName && listing.cropName !== defaultName ? listing.cropName : '',
      quantity,
      weightUnit: unit,
      landAreaInput: landValue,
      landAreaUnit: landUnit,
      baleType: listing.baleType,
      pricePerUnit,
      moisture: listing.moisturePercentage,
      imageUrl: listing.imageUrl || '',
    };
  }

  if (prefill) {
    const crop = prefill.cropType || 'paddy';
    const unit: WeightUnit = prefill.weightUnit || 'tonne';
    const coeff = CROP_COEFFICIENTS[crop] || CROP_COEFFICIENTS.paddy;
    const qty =
      prefill.quantityTonnes !== undefined && prefill.quantityTonnes > 0
        ? fromTonnes(prefill.quantityTonnes, unit)
        : '';
    const factor = unit === 'kg' ? 0.001 : unit === 'quintal' ? 0.1 : 1;
    const unitPrice =
      prefill.pricePerUnit && prefill.pricePerUnit > 0
        ? prefill.pricePerUnit
        : prefill.pricePerTonne && prefill.pricePerTonne > 0
          ? Math.round(prefill.pricePerTonne * factor * 100) / 100
          : '';
    const landUnit: LandAreaUnit = prefill.landAreaUnit || 'acre';
    const landInput =
      prefill.originalLandArea !== undefined
        ? String(prefill.originalLandArea)
        : prefill.acres !== undefined
          ? String(prefill.acres)
          : '';

    return {
      cropType: crop,
      customCropName: '',
      quantity: qty,
      weightUnit: unit,
      landAreaInput: landInput,
      landAreaUnit: landUnit,
      baleType: prefill.baleType || 'baled',
      pricePerUnit: unitPrice,
      moisture: prefill.moisturePercent ?? coeff.typicalMoisturePercent,
      imageUrl: '',
    };
  }

  return {
    cropType: 'paddy',
    customCropName: '',
    quantity: '',
    weightUnit: 'tonne',
    landAreaInput: '',
    landAreaUnit: 'acre',
    baleType: 'baled',
    pricePerUnit: '',
    moisture: CROP_COEFFICIENTS.paddy.typicalMoisturePercent,
    imageUrl: '',
  };
}

interface Props {
  value: ResidueFormState;
  onChange: (next: ResidueFormState) => void;
  isEdit?: boolean;
}

export default function ResidueListingFields({ value, onChange, isEdit = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const coeff = CROP_COEFFICIENTS[value.cropType] || CROP_COEFFICIENTS.paddy;
  const qtyNum = Number(value.quantity) || 0;
  const priceNum = Number(value.pricePerUnit) || 0;
  const normalizedTonnes = toTonnes(qtyNum, value.weightUnit);
  const normalizedPerTonne = pricePerUnitToPerTonne(priceNum, value.weightUnit);
  const estimatedPayout = Math.round(qtyNum * priceNum);

  const normalizedWeightText =
    normalizedTonnes === 0
      ? '0'
      : normalizedTonnes.toFixed(Math.round(normalizedTonnes * 1000) % 10 !== 0 ? 3 : 2);

  const handleCropChange = (nextCrop: CropType) => {
    const nextCoeff = CROP_COEFFICIENTS[nextCrop];
    if (!nextCoeff) {
      onChange({ ...value, cropType: nextCrop });
      return;
    }

    const prevCat = CROP_COEFFICIENTS[value.cropType]?.category;
    const isFreshNext = nextCoeff.category === 'vegetables' || nextCoeff.category === 'fruits';
    const wasFreshPrev = prevCat === 'vegetables' || prevCat === 'fruits';

    if (!isEdit && isFreshNext !== wasFreshPrev && value.quantity === '' && value.pricePerUnit === '') {
      onChange({
        ...value,
        cropType: nextCrop,
        weightUnit: isFreshNext ? 'kg' : 'tonne',
        moisture: nextCoeff.typicalMoisturePercent,
      });
      return;
    }

    onChange({
      ...value,
      cropType: nextCrop,
      moisture: !isEdit ? nextCoeff.typicalMoisturePercent : value.moisture,
    });
  };

  const handleUnitChange = (nextUnit: WeightUnit) => {
    if (nextUnit === value.weightUnit) return;
    if (isEdit && value.quantity !== '') {
      const tonnes = toTonnes(Number(value.quantity) || 0, value.weightUnit);
      const perTonne = pricePerUnitToPerTonne(Number(value.pricePerUnit) || 0, value.weightUnit);
      const factor = nextUnit === 'kg' ? 0.001 : nextUnit === 'quintal' ? 0.1 : 1;
      onChange({
        ...value,
        weightUnit: nextUnit,
        quantity: fromTonnes(tonnes, nextUnit),
        pricePerUnit:
          value.pricePerUnit === ''
            ? ''
            : Math.max(0, Number((perTonne * factor).toFixed(2))),
      });
      return;
    }

    onChange({ ...value, weightUnit: nextUnit });
  };

  const handleApplyAcreEstimate = () => {
    if (value.landAreaInput === '') return;
    const acres = toAcres(Number(value.landAreaInput) || 0, value.landAreaUnit);
    const est = estimateResidue(value.cropType, acres, value.baleType);
    onChange({
      ...value,
      quantity: fromTonnes(est.recoverableTonnes, value.weightUnit),
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError('');
    setUploading(true);
    try {
      const compressed = await compressProductImage(file);
      onChange({ ...value, imageUrl: compressed });
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to process selected image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Crop Residue / Farm Produce Type
          </label>
          <select
            value={value.cropType}
            onChange={(e) => handleCropChange(e.target.value as CropType)}
            className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
          >
            <optgroup label="Crop Residue & Biomass">
              <option value="paddy">Paddy Straw (Parali)</option>
              <option value="wheat">Wheat Straw (Bhusa)</option>
              <option value="mustard">Mustard Stalk &amp; Husk</option>
              <option value="sugarcane">Sugarcane Bagasse</option>
              <option value="cotton">Cotton Stalks</option>
              <option value="maize">Maize Stover &amp; Cobs</option>
              <option value="agri_waste">Organic Agri-Waste</option>
            </optgroup>
            <optgroup label="Fresh Vegetables, Fruits & Orchard Produce">
              <option value="vegetables">Fresh Vegetables Lot</option>
              <option value="fruits">Seasonal Fruits Lot</option>
              <option value="orchard">Orchard / Horticultural Produce</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Produce Variety / Lot Label (Optional)
          </label>
          <input
            type="text"
            value={value.customCropName}
            onChange={(e) => onChange({ ...value, customCropName: e.target.value })}
            placeholder={`Default: ${coeff.cropName}`}
            className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Available Quantity
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder={value.weightUnit === 'kg' ? 'e.g. 500' : 'e.g. 15'}
              value={value.quantity}
              onChange={(e) =>
                onChange({
                  ...value,
                  quantity: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              required
            />
            <select
              value={value.weightUnit}
              onChange={(e) => handleUnitChange(e.target.value as WeightUnit)}
              className="w-40 shrink-0 px-2.5 py-2 bg-sand border border-earth-border rounded-xl text-xs font-bold text-charcoal focus:outline-none focus:border-forest"
            >
              {(Object.keys(UNIT_LABELS) as WeightUnit[]).map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
            Expected Farmgate Price (₹ / {UNIT_SHORT[value.weightUnit]})
          </label>
          <input
            type="number"
            min="0.5"
            step="any"
            placeholder={
              value.weightUnit === 'kg'
                ? 'e.g. 22'
                : value.weightUnit === 'quintal'
                  ? 'e.g. 1850'
                  : 'e.g. 1650'
            }
            value={value.pricePerUnit}
            onChange={(e) =>
              onChange({
                ...value,
                pricePerUnit: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
              })
            }
            className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
            required
          />
        </div>

        <LandAreaField
          value={value.landAreaInput}
          unit={value.landAreaUnit}
          onChangeValue={(landAreaInput) => onChange({ ...value, landAreaInput })}
          onChangeUnit={(landAreaUnit) => onChange({ ...value, landAreaUnit })}
          label="Farmland Area (Optional, 0 allowed)"
          rightAction={
            value.landAreaInput !== '' ? (
              <button
                type="button"
                onClick={handleApplyAcreEstimate}
                className="text-[10px] font-bold text-forest hover:underline shrink-0"
              >
                Auto-Estimate Qty
              </button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Form / Packaging
            </label>
            <select
              value={value.baleType}
              onChange={(e) => onChange({ ...value, baleType: e.target.value as BaleType })}
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
            >
              <option value="baled">Baled / Crated Lot</option>
              <option value="chopped">Chopped / Graded</option>
              <option value="loose">Loose / Bulk Harvest</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-muted uppercase mb-1">
              Moisture %
            </label>
            <input
              type="number"
              min="1"
              max="95"
              step="0.5"
              value={value.moisture}
              onChange={(e) => onChange({ ...value, moisture: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
              required
            />
          </div>
        </div>
      </div>

      {/* Product Photo Upload & Compression */}
      <div className="p-3.5 rounded-2xl bg-sand border border-earth-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-charcoal-muted uppercase">
            Product Photo (Field Lot / Produce Preview)
          </span>
          <span className="text-[10px] text-charcoal-muted">JPG, PNG, WebP • Auto-compressed</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {value.imageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={value.imageUrl}
              alt="Listing preview"
              className="w-20 h-16 object-cover rounded-xl border border-earth-border bg-white shrink-0"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-white border border-earth-border hover:border-forest text-xs font-semibold text-charcoal transition"
              >
                {uploading ? 'Compressing...' : 'Replace Photo'}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, imageUrl: '' })}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-earth-border hover:border-forest bg-white text-xs font-semibold text-charcoal-soft flex items-center justify-center gap-2 transition"
          >
            <ImagePlus className="w-4 h-4 text-forest" />
            <span>{uploading ? 'Compressing Image...' : 'Upload Product Photo'}</span>
          </button>
        )}

        {uploadError && (
          <div className="text-[11px] font-semibold text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Live Metric Equivalence & Payout Preview */}
      <div className="p-4 rounded-2xl bg-forest-50/50 border border-forest-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-forest-800">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-forest" />
            Unit Conversion &amp; Payout Computation
          </span>
          <span>Live Metric Equivalence</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2 rounded-xl bg-white border border-forest-100">
            <span className="text-[10px] text-charcoal-muted block">Normalized Weight</span>
            <span className="text-sm font-bold text-charcoal">{normalizedWeightText} Tonnes</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-forest-100">
            <span className="text-[10px] text-charcoal-muted block">Metric Rate</span>
            <span className="text-sm font-bold text-forest">
              ₹{normalizedPerTonne.toLocaleString('en-IN')}/t
            </span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-forest-100">
            <span className="text-[10px] text-charcoal-muted block">Estimated Payout</span>
            <span className="text-sm font-bold text-forest">
              ₹{estimatedPayout.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
