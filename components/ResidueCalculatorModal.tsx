'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Calculator,
  ArrowRight,
  Info,
  Leaf,
  Coins,
  Scale,
  CheckCircle2,
  Truck,
  Building2,
  AlertCircle,
  Bookmark,
  History,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  CropType,
  BaleType,
  CalculatorEstimate,
  LandAreaUnit,
  SavedCalculation,
  WeightUnit,
} from '../types';
import {
  CROP_COEFFICIENTS,
  estimateResidue,
  recommendVehicle,
  calculateDeliveredCost,
} from '../lib/engine';
import {
  StrawSyncStore,
  fromTonnes,
  pricePerUnitToPerTonne,
  toAcres,
  toTonnes,
} from '../lib/store';
import LandAreaField from './LandAreaField';

interface Props {
  onClose: () => void;
  onApplyToListing?: (data: {
    cropType: CropType;
    landAreaAcres: number;
    baleType: BaleType;
    estimatedTonnes: number;
    expectedEarnings: number;
    expectedPricePerTonne?: number;
  }) => void;
}

export default function ResidueCalculatorModal({ onClose, onApplyToListing }: Props) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<'farmer' | 'buyer'>('farmer');

  // Mode 1: Field Yield Estimator (Farmer)
  const [cropType, setCropType] = useState<CropType>('paddy');
  const [landAreaInput, setLandAreaInput] = useState<string>('15');
  const [landAreaUnit, setLandAreaUnit] = useState<LandAreaUnit>('acre');
  const [baleType, setBaleType] = useState<BaleType>('baled');
  const [moisturePercent, setMoisturePercent] = useState<number>(
    CROP_COEFFICIENTS.paddy.typicalMoisturePercent
  );
  const [expectedPricePerTonne, setExpectedPricePerTonne] = useState<string>(() =>
    String(
      Math.round(
        (CROP_COEFFICIENTS.paddy.marketBaseRateMin + CROP_COEFFICIENTS.paddy.marketBaseRateMax) / 2
      )
    )
  );

  // Mode 2: Quantity & Order Cost Calculator (Buyer / Deal Planner)
  const [buyerCropType, setBuyerCropType] = useState<CropType>('paddy');
  const [buyerQtyInput, setBuyerQtyInput] = useState<string>('40');
  const [buyerWeightUnit, setBuyerWeightUnit] = useState<WeightUnit>('tonne');
  const [buyerUnitPriceInput, setBuyerUnitPriceInput] = useState<string>('1700');
  const [buyerDistanceInput, setBuyerDistanceInput] = useState<string>('65');

  const [savedList, setSavedList] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [saveNotice, setSaveNotice] = useState<string>('');
  const [rolePrompt, setRolePrompt] = useState<string>('');

  useEffect(() => {
    setSavedList(StrawSyncStore.getSavedCalculations());
    const unsub = StrawSyncStore.subscribe(() => {
      setSavedList(StrawSyncStore.getSavedCalculations());
    });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qCrop = params.get('crop') as CropType | null;
      const qAcres = params.get('acres');
      const qBale = params.get('bale') as BaleType | null;
      if (qCrop && CROP_COEFFICIENTS[qCrop]) setCropType(qCrop);
      if (qAcres !== null && qAcres !== '' && Number(qAcres) >= 0) setLandAreaInput(qAcres);
      if (qBale && ['baled', 'chopped', 'loose'].includes(qBale)) setBaleType(qBale);
    }

    return () => unsub();
  }, []);

  // Mode 1 Computations
  const coeff = CROP_COEFFICIENTS[cropType] || CROP_COEFFICIENTS.paddy;
  const rawLandVal = landAreaInput === '' ? 0 : Math.max(0, Number(landAreaInput) || 0);
  const normalizedAcres = toAcres(rawLandVal, landAreaUnit);
  const estimates = estimateResidue(cropType, normalizedAcres, baleType);
  const recoverableQuintals = fromTonnes(estimates.recoverableTonnes, 'quintal');
  const farmerRateNum = Math.max(0, Number(expectedPricePerTonne) || 0);
  const estimatedRevenue = Math.round(estimates.recoverableTonnes * farmerRateNum);
  const co2PreventedTonnes = Number(
    (estimates.recoverableTonnes * coeff.co2AbatementTonnesPerTonne).toFixed(1)
  );

  // Mode 2 Computations
  const buyerCoeff = CROP_COEFFICIENTS[buyerCropType] || CROP_COEFFICIENTS.paddy;
  const buyerQtyNum = buyerQtyInput === '' ? 0 : Math.max(0, Number(buyerQtyInput) || 0);
  const buyerRateNum =
    buyerUnitPriceInput === '' ? 0 : Math.max(0, Number(buyerUnitPriceInput) || 0);
  const buyerDistNum =
    buyerDistanceInput === '' ? 0 : Math.max(0, Number(buyerDistanceInput) || 0);

  const buyerTonnes = toTonnes(buyerQtyNum, buyerWeightUnit);
  const buyerRatePerTonne = pricePerUnitToPerTonne(buyerRateNum, buyerWeightUnit);
  const materialSubtotal = Math.round(buyerQtyNum * buyerRateNum);
  const vehicle = recommendVehicle(Math.max(0.5, buyerTonnes), Math.max(5, buyerDistNum));
  const landedCost =
    buyerTonnes <= 0
      ? { freightPerTonne: 0, totalFreight: 0, deliveredPricePerTonne: 0, totalDeliveredCost: 0 }
      : calculateDeliveredCost(
          buyerRatePerTonne,
          Math.max(0.01, buyerTonnes),
          Math.max(0, buyerDistNum),
          vehicle
        );
  const totalDealValue = materialSubtotal + landedCost.totalFreight;
  const buyerCo2Tonnes = Number(
    (buyerTonnes * buyerCoeff.co2AbatementTonnesPerTonne).toFixed(1)
  );

  const handleFarmerCropChange = (nextCrop: CropType) => {
    const nextCoeff = CROP_COEFFICIENTS[nextCrop] || CROP_COEFFICIENTS.paddy;
    setCropType(nextCrop);
    setMoisturePercent(nextCoeff.typicalMoisturePercent);
    setExpectedPricePerTonne(
      String(Math.round((nextCoeff.marketBaseRateMin + nextCoeff.marketBaseRateMax) / 2))
    );
  };

  const handleBuyerCropChange = (nextCrop: CropType) => {
    const nextCoeff = CROP_COEFFICIENTS[nextCrop] || CROP_COEFFICIENTS.paddy;
    const midPerTonne = Math.round((nextCoeff.marketBaseRateMin + nextCoeff.marketBaseRateMax) / 2);
    const factor = buyerWeightUnit === 'kg' ? 0.001 : buyerWeightUnit === 'quintal' ? 0.1 : 1;
    setBuyerCropType(nextCrop);
    setBuyerUnitPriceInput(String(Math.max(1, Math.round(midPerTonne * factor))));
  };

  const buildEstimateSnapshot = (): Omit<CalculatorEstimate, 'createdAt'> => {
    if (activeMode === 'farmer') {
      return {
        mode: 'farmer',
        cropType,
        acres: normalizedAcres,
        landAreaUnit,
        originalLandArea: rawLandVal,
        baleType,
        moisturePercent,
        quantityTonnes: estimates.recoverableTonnes,
        weightUnit: 'tonne',
        pricePerUnit: farmerRateNum,
        pricePerTonne: farmerRateNum,
        totalAmount: estimatedRevenue,
        co2SavedTonnes: co2PreventedTonnes,
      };
    }

    return {
      mode: 'buyer',
      cropType: buyerCropType,
      moisturePercent: buyerCoeff.typicalMoisturePercent,
      quantityTonnes: buyerTonnes,
      weightUnit: buyerWeightUnit,
      pricePerUnit: buyerRateNum,
      pricePerTonne:
        buyerTonnes > 0
          ? Math.round(totalDealValue / buyerTonnes)
          : buyerRatePerTonne,
      distanceKm: buyerDistNum,
      freightTotal: landedCost.totalFreight,
      totalAmount: totalDealValue,
      co2SavedTonnes: buyerCo2Tonnes,
    };
  };

  const handleSaveCalculation = () => {
    setSaveNotice('');
    if (activeMode === 'farmer') {
      StrawSyncStore.saveCalculation({
        mode: 'farmer',
        cropType,
        cropName: coeff.cropName,
        landAreaValue: rawLandVal,
        landAreaUnit,
        landAreaAcres: normalizedAcres,
        baleType,
        moisturePercent,
        quantityValue: estimates.recoverableTonnes,
        weightUnit: 'tonne',
        quantityTonnes: estimates.recoverableTonnes,
        pricePerUnit: farmerRateNum,
        pricePerTonne: farmerRateNum,
        estimatedValue: estimatedRevenue,
        co2SavedTonnes: co2PreventedTonnes,
      });
    } else {
      StrawSyncStore.saveCalculation({
        mode: 'buyer',
        cropType: buyerCropType,
        cropName: buyerCoeff.cropName,
        moisturePercent: buyerCoeff.typicalMoisturePercent,
        quantityValue: buyerQtyNum,
        weightUnit: buyerWeightUnit,
        quantityTonnes: buyerTonnes,
        pricePerUnit: buyerRateNum,
        pricePerTonne: buyerRatePerTonne,
        distanceKm: buyerDistNum,
        freightTotal: landedCost.totalFreight,
        materialTotal: materialSubtotal,
        estimatedValue: totalDealValue,
        co2SavedTonnes: buyerCo2Tonnes,
      });
    }
    setShowHistory(true);
    setSaveNotice('Saved calculation to browser history!');
    setTimeout(() => setSaveNotice(''), 3000);
  };

  const handleLoadSaved = (item: SavedCalculation) => {
    setRolePrompt('');
    if (item.mode === 'farmer') {
      setActiveMode('farmer');
      setCropType(item.cropType);
      setLandAreaUnit(item.landAreaUnit || 'acre');
      setLandAreaInput(String(item.landAreaValue ?? item.landAreaAcres ?? 0));
      setBaleType(item.baleType || 'baled');
      setMoisturePercent(
        item.moisturePercent ?? CROP_COEFFICIENTS[item.cropType]?.typicalMoisturePercent ?? 14
      );
      setExpectedPricePerTonne(String(item.pricePerTonne || 1700));
    } else {
      setActiveMode('buyer');
      setBuyerCropType(item.cropType);
      setBuyerWeightUnit(item.weightUnit || 'tonne');
      setBuyerQtyInput(String(item.quantityValue ?? item.quantityTonnes));
      setBuyerUnitPriceInput(String(item.pricePerUnit ?? item.pricePerTonne));
      setBuyerDistanceInput(String(item.distanceKm ?? 50));
    }
  };

  const applySavedOrCurrent = (
    target: 'listing' | 'demand',
    overrideEstimate?: Omit<CalculatorEstimate, 'createdAt'>
  ) => {
    setRolePrompt('');
    const snap = overrideEstimate || buildEstimateSnapshot();

    if (target === 'listing') {
      const saved = StrawSyncStore.setCalculatorPrefill('listing', {
        ...snap,
        mode: 'farmer',
        weightUnit: overrideEstimate ? snap.weightUnit : activeMode === 'buyer' ? buyerWeightUnit : 'tonne',
      });
      if (onApplyToListing) {
        onApplyToListing({
          cropType: saved.cropType,
          landAreaAcres: saved.acres || 0,
          baleType: saved.baleType || 'baled',
          estimatedTonnes: saved.quantityTonnes,
          expectedEarnings: saved.totalAmount,
          expectedPricePerTonne: saved.pricePerTonne,
        });
        onClose();
        return;
      }
      const user = StrawSyncStore.getCurrentUser();
      if (user && (user.role === 'farmer' || user.role === 'admin')) {
        onClose();
        router.push('/farmer/listings?fromCalculator=1');
      } else {
        setRolePrompt('Estimate saved! Sign in or register with a Farmer account to publish it.');
      }
      return;
    }

    StrawSyncStore.setCalculatorPrefill('demand', {
      ...snap,
      mode: 'buyer',
    });
    const user = StrawSyncStore.getCurrentUser();
    if (user && (user.role === 'buyer' || user.role === 'admin')) {
      onClose();
      router.push('/buyer/marketplace?fromCalculator=1');
    } else {
      setRolePrompt('Estimate saved! Sign in or register with a Buyer account to create demand.');
    }
  };

  const renderCropOptions = () => (
    <>
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
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-elevated border border-earth-border overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-sand-100 border-b border-earth-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest flex items-center justify-center">
              <Calculator className="w-5 h-5 text-forest" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-charcoal">
                StrawSync Field Yield &amp; Cost Calculator
              </h3>
              <p className="text-[11px] text-charcoal-muted">
                Supports Indian land units, zero area inputs, order cost planning &amp; saved history
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-earth-border flex items-center justify-center text-charcoal-muted hover:text-charcoal transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="px-6 pt-3 pb-2 bg-white border-b border-earth-border flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveMode('farmer');
              setRolePrompt('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'farmer'
                ? 'bg-forest text-white shadow-subtle'
                : 'bg-sand text-charcoal-muted hover:text-charcoal border border-earth-border'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Field Yield Estimator (Farmer)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('buyer');
              setRolePrompt('');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeMode === 'buyer'
                ? 'bg-blue-800 text-white shadow-subtle'
                : 'bg-sand text-charcoal-muted hover:text-charcoal border border-earth-border'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Quantity &amp; Order Cost (Buyer)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {rolePrompt && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{rolePrompt}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/login');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-forest text-white font-bold text-[11px]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/register');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-earth-border text-charcoal font-bold text-[11px]"
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {saveNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-forest-200 text-xs font-bold text-forest-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          {activeMode === 'farmer' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Crop / Produce Type
                  </label>
                  <select
                    value={cropType}
                    onChange={(e) => handleFarmerCropChange(e.target.value as CropType)}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  >
                    {renderCropOptions()}
                  </select>
                </div>

                <LandAreaField
                  value={landAreaInput}
                  unit={landAreaUnit}
                  onChangeValue={setLandAreaInput}
                  onChangeUnit={setLandAreaUnit}
                  label="Farmland Area (0 allowed)"
                />

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Collection Method
                  </label>
                  <select
                    value={baleType}
                    onChange={(e) => setBaleType(e.target.value as BaleType)}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  >
                    <option value="baled">Square / Round Baled (82% Eff.)</option>
                    <option value="chopped">Chopped &amp; Mulched (78% Eff.)</option>
                    <option value="loose">Loose Field Harvest (72% Eff.)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Expected Rate (₹ / Tonne)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={expectedPricePerTonne}
                    onChange={(e) => setExpectedPricePerTonne(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sand rounded-2xl p-4 border border-earth-border">
                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                    <Scale className="w-3.5 h-3.5 text-forest" />
                    <span>Gross Residue</span>
                  </div>
                  <div className="text-lg font-bold text-charcoal">
                    {estimates.grossTonnes} <span className="text-xs font-normal">t</span>
                  </div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5">
                    {normalizedAcres} Acres equiv.
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-forest-200 bg-forest-50/40">
                  <div className="flex items-center gap-1.5 text-forest-700 text-[11px] font-semibold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-forest" />
                    <span>Recoverable</span>
                  </div>
                  <div className="text-lg font-bold text-forest-700">
                    {estimates.recoverableTonnes} <span className="text-xs font-normal">t</span>
                  </div>
                  <div className="text-[10px] text-forest-700 mt-0.5">
                    {recoverableQuintals} Quintals
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>Estimated Value</span>
                  </div>
                  <div className="text-lg font-bold text-charcoal">
                    ₹{estimatedRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5">
                    @ ₹{farmerRateNum.toLocaleString('en-IN')}/t
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <div className="flex items-center gap-1.5 text-charcoal-muted text-[11px] font-semibold mb-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CO₂ Prevented</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-700">
                    {co2PreventedTonnes} <span className="text-xs font-normal">t</span>
                  </div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5">
                    ~{moisturePercent}% moisture
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Produce / Residue Type
                  </label>
                  <select
                    value={buyerCropType}
                    onChange={(e) => handleBuyerCropChange(e.target.value as CropType)}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-blue-700"
                  >
                    {renderCropOptions()}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Required Quantity &amp; Weight Unit
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={buyerQtyInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || Number(v) >= 0) setBuyerQtyInput(v);
                      }}
                      className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-blue-700"
                    />
                    <select
                      value={buyerWeightUnit}
                      onChange={(e) => setBuyerWeightUnit(e.target.value as WeightUnit)}
                      className="w-32 shrink-0 px-2.5 py-2 bg-sand border border-earth-border rounded-xl text-xs font-bold text-charcoal focus:outline-none focus:border-blue-700"
                    >
                      <option value="kg">Kg</option>
                      <option value="quintal">Quintal</option>
                      <option value="tonne">Tonne</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Rate per {buyerWeightUnit} (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={buyerUnitPriceInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || Number(v) >= 0) setBuyerUnitPriceInput(v);
                    }}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-charcoal-muted uppercase mb-1">
                    Estimated Haulage Distance (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={buyerDistanceInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || Number(v) >= 0) setBuyerDistanceInput(v);
                    }}
                    className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-sand rounded-2xl p-4 border border-earth-border">
                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <span className="text-[11px] text-charcoal-muted font-semibold block mb-1">
                    Total Weight
                  </span>
                  <div className="text-lg font-bold text-charcoal">{buyerTonnes} t</div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5">
                    {buyerQtyNum} {buyerWeightUnit}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <span className="text-[11px] text-charcoal-muted font-semibold block mb-1">
                    Material Cost
                  </span>
                  <div className="text-lg font-bold text-charcoal">
                    ₹{materialSubtotal.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5">
                    @ ₹{buyerRatePerTonne.toLocaleString('en-IN')}/t
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-earth-border">
                  <span className="text-[11px] text-charcoal-muted font-semibold block mb-1">
                    Est. Freight Cost
                  </span>
                  <div className="text-lg font-bold text-amber-700">
                    ₹{landedCost.totalFreight.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-charcoal-muted mt-0.5 truncate">
                    {buyerDistNum} km • {vehicle.name.split('(')[0]}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                  <span className="text-[11px] text-blue-800 font-semibold block mb-1">
                    Total Deal Value
                  </span>
                  <div className="text-lg font-bold text-blue-900">
                    ₹{totalDealValue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-blue-700 mt-0.5">
                    Incl. freight escrow
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Calculation Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-sage/50 border border-forest-100 text-xs">
            <div className="flex items-center gap-1.5 text-forest-800 font-semibold">
              <Info className="w-4 h-4 text-forest shrink-0" />
              <span>Save snapshot to reload or apply anytime</span>
            </div>
            <button
              type="button"
              onClick={handleSaveCalculation}
              className="px-3.5 py-1.5 bg-white hover:bg-forest-50 border border-forest-200 text-forest rounded-xl font-bold flex items-center gap-1.5 transition"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Calculation</span>
            </button>
          </div>

          {/* Saved Calculations History Panel */}
          <div className="rounded-2xl border border-earth-border bg-sand/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-bold text-charcoal hover:bg-sand transition"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-forest" />
                <span>Saved Calculations ({savedList.length})</span>
              </span>
              <span className="text-[11px] text-charcoal-muted">
                {showHistory ? 'Hide' : 'Show'}
              </span>
            </button>

            {showHistory && (
              <div className="px-4 pb-3 space-y-2 max-h-44 overflow-y-auto">
                {savedList.length === 0 ? (
                  <p className="text-[11px] text-charcoal-muted py-2 text-center">
                    No saved calculations yet. Click &ldquo;Save Calculation&rdquo; above to keep an estimate.
                  </p>
                ) : (
                  savedList.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-white border border-earth-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-charcoal">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                              item.mode === 'farmer'
                                ? 'bg-emerald-50 text-forest'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {item.mode === 'farmer' ? 'Yield' : 'Order Cost'}
                          </span>
                          <span className="truncate">{item.cropName}</span>
                        </div>
                        <div className="text-charcoal-muted mt-0.5">
                          {item.mode === 'farmer'
                            ? `${item.landAreaValue ?? item.landAreaAcres ?? 0} ${item.landAreaUnit || 'acre'} → ${item.quantityTonnes}t`
                            : `${item.quantityValue} ${item.weightUnit} (${item.quantityTonnes}t)`}{' '}
                          • <strong className="text-forest">₹{item.estimatedValue.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSaved(item)}
                          className="px-2 py-1 rounded-lg bg-sand hover:bg-forest-50 border border-earth-border font-bold text-charcoal flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Load</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            applySavedOrCurrent(
                              item.mode === 'farmer' ? 'listing' : 'demand',
                              {
                                mode: item.mode,
                                cropType: item.cropType,
                                acres: item.landAreaAcres,
                                landAreaUnit: item.landAreaUnit,
                                originalLandArea: item.landAreaValue,
                                baleType: item.baleType,
                                moisturePercent: item.moisturePercent,
                                quantityTonnes: item.quantityTonnes,
                                weightUnit: item.weightUnit,
                                pricePerUnit: item.pricePerUnit,
                                pricePerTonne: item.pricePerTonne,
                                distanceKm: item.distanceKm,
                                freightTotal: item.freightTotal,
                                totalAmount: item.estimatedValue,
                                co2SavedTonnes: item.co2SavedTonnes,
                              }
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-forest text-white font-bold"
                        >
                          {item.mode === 'farmer' ? 'Use in Listing' : 'Use in Order'}
                        </button>
                        <button
                          type="button"
                          aria-label="Delete saved calculation"
                          onClick={() => StrawSyncStore.deleteSavedCalculation(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="px-6 py-4 bg-sand border-t border-earth-border flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-charcoal-muted hover:text-charcoal transition"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applySavedOrCurrent('demand')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-subtle transition"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Create Buyer Demand</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => applySavedOrCurrent('listing')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-forest hover:bg-forest-700 text-white rounded-xl text-xs font-bold shadow-subtle transition"
            >
              <span>Publish as Farmer Listing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
