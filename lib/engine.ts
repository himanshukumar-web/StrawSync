import {
  CropType,
  ListingCategory,
  BaleType,
  Coordinates,
  ResidueListing,
  BuyerDemand,
  MatchResult,
  MatchScoreBreakdown,
  VehicleOption
} from '../types';

/**
 * Agronomic Residue Generation & Farm Produce Parameters
 * Derived from Indian Agricultural Research Institute (IARI) and MNRE benchmarks.
 */
export interface CropCoefficient {
  cropName: string;
  category: ListingCategory;
  residueRatioTonnesPerAcre: number; // Avg gross residue generated per acre
  defaultRecoveryRate: number;      // Typical field collection recovery factor (0.0 to 1.0)
  calorificValueKcalPerKg: number;  // Higher Heating Value (HHV)
  typicalMoisturePercent: number;
  marketBaseRateMin: number;        // Fair price floor ₹/tonne
  marketBaseRateMax: number;        // Fair price ceiling ₹/tonne
  co2AbatementTonnesPerTonne: number; // CO2e prevented by avoiding open burning
}

export const CROP_COEFFICIENTS: Record<CropType, CropCoefficient> = {
  paddy: {
    cropName: 'Paddy Straw (Parali)',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 1.6,
    defaultRecoveryRate: 0.82, // 82% recoverable with baler/reaper
    calorificValueKcalPerKg: 3400,
    typicalMoisturePercent: 14,
    marketBaseRateMin: 1400,
    marketBaseRateMax: 2200,
    co2AbatementTonnesPerTonne: 1.45,
  },
  wheat: {
    cropName: 'Wheat Straw (Toosa / Bhusa)',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 1.4,
    defaultRecoveryRate: 0.88,
    calorificValueKcalPerKg: 3600,
    typicalMoisturePercent: 11,
    marketBaseRateMin: 2200,
    marketBaseRateMax: 3200,
    co2AbatementTonnesPerTonne: 1.35,
  },
  mustard: {
    cropName: 'Mustard Stalk & Husk',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 1.1,
    defaultRecoveryRate: 0.78,
    calorificValueKcalPerKg: 4000,
    typicalMoisturePercent: 9,
    marketBaseRateMin: 1800,
    marketBaseRateMax: 2600,
    co2AbatementTonnesPerTonne: 1.40,
  },
  sugarcane: {
    cropName: 'Sugarcane Trash / Bagasse',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 3.4,
    defaultRecoveryRate: 0.72,
    calorificValueKcalPerKg: 2800,
    typicalMoisturePercent: 22,
    marketBaseRateMin: 1200,
    marketBaseRateMax: 1900,
    co2AbatementTonnesPerTonne: 1.25,
  },
  cotton: {
    cropName: 'Cotton Stalks',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 1.25,
    defaultRecoveryRate: 0.75,
    calorificValueKcalPerKg: 4100,
    typicalMoisturePercent: 13,
    marketBaseRateMin: 1600,
    marketBaseRateMax: 2400,
    co2AbatementTonnesPerTonne: 1.38,
  },
  maize: {
    cropName: 'Maize Stover & Cobs',
    category: 'crop_residue',
    residueRatioTonnesPerAcre: 1.85,
    defaultRecoveryRate: 0.80,
    calorificValueKcalPerKg: 3750,
    typicalMoisturePercent: 15,
    marketBaseRateMin: 1500,
    marketBaseRateMax: 2300,
    co2AbatementTonnesPerTonne: 1.42,
  },
  vegetables: {
    cropName: 'Fresh Vegetables Lot',
    category: 'vegetables',
    residueRatioTonnesPerAcre: 6.5,
    defaultRecoveryRate: 0.92,
    calorificValueKcalPerKg: 1200,
    typicalMoisturePercent: 78,
    marketBaseRateMin: 12000,
    marketBaseRateMax: 28000,
    co2AbatementTonnesPerTonne: 0.90,
  },
  fruits: {
    cropName: 'Seasonal Fruits Lot',
    category: 'fruits',
    residueRatioTonnesPerAcre: 5.5,
    defaultRecoveryRate: 0.90,
    calorificValueKcalPerKg: 1400,
    typicalMoisturePercent: 80,
    marketBaseRateMin: 18000,
    marketBaseRateMax: 45000,
    co2AbatementTonnesPerTonne: 0.95,
  },
  orchard: {
    cropName: 'Orchard / Horticultural Produce',
    category: 'fruits',
    residueRatioTonnesPerAcre: 4.5,
    defaultRecoveryRate: 0.88,
    calorificValueKcalPerKg: 1600,
    typicalMoisturePercent: 65,
    marketBaseRateMin: 15000,
    marketBaseRateMax: 35000,
    co2AbatementTonnesPerTonne: 1.00,
  },
  agri_waste: {
    cropName: 'Organic Agri-Waste',
    category: 'agri_waste',
    residueRatioTonnesPerAcre: 1.8,
    defaultRecoveryRate: 0.80,
    calorificValueKcalPerKg: 3100,
    typicalMoisturePercent: 20,
    marketBaseRateMin: 1100,
    marketBaseRateMax: 2000,
    co2AbatementTonnesPerTonne: 1.30,
  },
};

/**
 * Standard Agricultural Transport Fleet in Indian Logistics
 */
export const FLEET_OPTIONS: VehicleOption[] = [
  {
    type: 'tractor_trolley',
    name: 'Tractor Trolley (Hydraulic 2-Wheel / 4-Wheel)',
    capacityTonnes: 4.5,
    ratePerKm: 28,
    baseLoadingCharge: 600,
    co2PerKmKg: 0.52,
  },
  {
    type: 'eicher_light',
    name: 'Eicher Pro 14ft / 17ft Medium Truck',
    capacityTonnes: 8.0,
    ratePerKm: 38,
    baseLoadingCharge: 1200,
    co2PerKmKg: 0.68,
  },
  {
    type: 'tata_heavy',
    name: 'Tata 22ft 6-Wheeler Heavy Rig',
    capacityTonnes: 15.0,
    ratePerKm: 48,
    baseLoadingCharge: 2000,
    co2PerKmKg: 0.95,
  },
  {
    type: 'multi_axle',
    name: 'Multi-Axle 10/12 Wheeler Long-Haul Hauler',
    capacityTonnes: 28.0,
    ratePerKm: 62,
    baseLoadingCharge: 3200,
    co2PerKmKg: 1.35,
  },
];

/**
 * 1. ESTIMATION ENGINE
 * Predicts gross field residue and recoverable commercial biomass based on agronomic models.
 */
export function estimateResidue(
  cropType: CropType,
  landAreaAcres: number,
  baleType: BaleType = 'baled'
): {
  grossTonnes: number;
  recoverableTonnes: number;
  assumptions: {
    yieldPerAcre: number;
    recoveryFactor: number;
    baleEfficiency: number;
  };
} {
  const coeff = CROP_COEFFICIENTS[cropType] || CROP_COEFFICIENTS.paddy;
  const safeAcres = Math.max(0, Number(landAreaAcres) || 0);
  const grossTonnes = Number((safeAcres * coeff.residueRatioTonnesPerAcre).toFixed(1));

  // Bale type efficiency adjustments: baled retains more than loose/windblown residue
  let baleEfficiency = 1.0;
  if (baleType === 'loose') baleEfficiency = 0.88;
  if (baleType === 'chopped') baleEfficiency = 0.94;

  const recoverableFactor = coeff.defaultRecoveryRate * baleEfficiency;
  const recoverableTonnes = Number((grossTonnes * recoverableFactor).toFixed(1));

  return {
    grossTonnes,
    recoverableTonnes,
    assumptions: {
      yieldPerAcre: coeff.residueRatioTonnesPerAcre,
      recoveryFactor: coeff.defaultRecoveryRate,
      baleEfficiency,
    },
  };
}

/**
 * Calculate Great-Circle Distance using the Haversine Formula
 * Returns road-adjusted distance in kilometers (standard Indian rural road winding factor of 1.22 applied).
 */
export function calculateRoadDistanceKm(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineDistance = R * c;

  // Road factor to approximate actual driving distance in agricultural terrain
  const roadAdjusted = straightLineDistance * 1.22;
  return Number(Math.max(5, roadAdjusted).toFixed(1));
}

/**
 * Recommends optimal vehicle based on batch quantity and haulage distance.
 */
export function recommendVehicle(quantityTonnes: number, distanceKm: number): VehicleOption {
  if (quantityTonnes <= 5.0 && distanceKm <= 35) {
    return FLEET_OPTIONS[0]; // Tractor Trolley ideal for short local runs
  } else if (quantityTonnes <= 10.0 || distanceKm <= 75) {
    return FLEET_OPTIONS[1]; // Eicher 14ft
  } else if (quantityTonnes <= 20.0 || distanceKm <= 160) {
    return FLEET_OPTIONS[2]; // Tata 22ft
  } else {
    return FLEET_OPTIONS[3]; // Multi-Axle Hauler for massive or regional hauls
  }
}

/**
 * Computes freight and delivered cost breakdown.
 */
export function calculateDeliveredCost(
  farmgatePricePerTonne: number,
  quantityTonnes: number,
  distanceKm: number,
  vehicle: VehicleOption
): {
  freightPerTonne: number;
  totalFreight: number;
  deliveredPricePerTonne: number;
  totalDeliveredCost: number;
} {
  const safeQty = Math.max(1, quantityTonnes);
  const totalFreight = (distanceKm * vehicle.ratePerKm) + vehicle.baseLoadingCharge;
  const freightPerTonne = Math.round(totalFreight / safeQty);
  const deliveredPricePerTonne = Math.round(farmgatePricePerTonne + freightPerTonne);
  const totalDeliveredCost = Math.round(deliveredPricePerTonne * safeQty);

  return {
    freightPerTonne,
    totalFreight: Math.round(totalFreight),
    deliveredPricePerTonne,
    totalDeliveredCost,
  };
}

/**
 * Evaluates compatibility and calculates transparent Match Score (0 - 100)
 */
export function evaluateMatch(
  listing: ResidueListing,
  demand: BuyerDemand
): MatchResult | null {
  // Hard incompatibility: Different crop
  if (listing.cropType !== demand.cropType) {
    return null;
  }

  // Hard incompatibility: Already fully committed, fulfilled, or sold
  const remainingNeededRaw = Math.max(0, demand.requiredTonnes - demand.fulfilledTonnes);
  if (listing.status === 'sold' || demand.status === 'fulfilled' || remainingNeededRaw <= 0) {
    return null;
  }

  const distanceKm = calculateRoadDistanceKm(
    listing.coordinates,
    demand.plantLocation.coordinates
  );

  // Recommended transport configuration
  const matchedTonnes = Math.min(listing.recoverableTonnes, remainingNeededRaw);
  const vehicle = recommendVehicle(matchedTonnes, distanceKm);
  const cost = calculateDeliveredCost(
    listing.expectedPricePerTonne,
    matchedTonnes,
    distanceKm,
    vehicle
  );

  const buyerMarginPerTonne = demand.maxDeliveredPricePerTonne - cost.deliveredPricePerTonne;

  // Criteria 1: Proximity & Distance (0 - 30 points)
  // Optimal within 30km, decays smoothly until 250km
  let distanceScore = 0;
  if (distanceKm <= 25) distanceScore = 30;
  else if (distanceKm <= 60) distanceScore = 26;
  else if (distanceKm <= 100) distanceScore = 20;
  else if (distanceKm <= 180) distanceScore = 13;
  else if (distanceKm <= 280) distanceScore = 6;
  else distanceScore = 2;

  // Criteria 2: Quantity Coverage (0 - 25 points)
  const remainingNeeded = Math.max(1, demand.requiredTonnes - demand.fulfilledTonnes);
  const coverageRatio = matchedTonnes / remainingNeeded;
  let quantityScore = 0;
  if (coverageRatio >= 0.7 && coverageRatio <= 1.3) quantityScore = 25; // Perfect batch match
  else if (coverageRatio > 1.3) quantityScore = 22; // Supplies plenty
  else if (coverageRatio >= 0.4) quantityScore = 18;
  else quantityScore = 12;

  // Criteria 3: Economic Viability / Delivered Price Margin (0 - 25 points)
  let priceViabilityScore = 0;
  if (buyerMarginPerTonne >= 300) priceViabilityScore = 25; // Significant savings for buyer
  else if (buyerMarginPerTonne >= 100) priceViabilityScore = 21;
  else if (buyerMarginPerTonne >= 0) priceViabilityScore = 17; // At budget
  else if (buyerMarginPerTonne >= -150) priceViabilityScore = 8; // Slight premium
  else priceViabilityScore = 2; // Over buyer budget

  // Criteria 4: Moisture and Quality Fit (0 - 20 points)
  let qualityScore = 0;
  if (listing.moisturePercentage <= demand.maxMoisturePercentage) {
    qualityScore += 12;
    if (listing.baleType === 'baled') qualityScore += 8; // High density baled
    else if (listing.baleType === 'chopped') qualityScore += 5;
    else qualityScore += 2;
  } else {
    // Excessive moisture penalty
    qualityScore = 4;
  }

  const totalScore = Math.min(100, Math.max(10, distanceScore + quantityScore + priceViabilityScore + qualityScore));

  // Generate transparent rationale for farmers and buyers
  const reasons: string[] = [];
  if (distanceKm <= 50) {
    reasons.push(`Optimal micro-cluster proximity (${distanceKm} km), reducing turnaround time and empty-return transit.`);
  } else {
    reasons.push(`Transport distance is ${distanceKm} km, serviced via ${vehicle.name}.`);
  }

  if (buyerMarginPerTonne >= 0) {
    reasons.push(`Delivered cost of ₹${cost.deliveredPricePerTonne}/t is ₹${buyerMarginPerTonne}/t below your max budget ceiling (₹${demand.maxDeliveredPricePerTonne}/t).`);
  } else {
    reasons.push(`Delivered cost of ₹${cost.deliveredPricePerTonne}/t exceeds current budget ceiling by ₹${Math.abs(buyerMarginPerTonne)}/t.`);
  }

  if (listing.baleType === 'baled') {
    reasons.push(`Baled supply with ${listing.moisturePercentage}% moisture matches industrial combustion and pelletization specs.`);
  } else {
    reasons.push(`Loose material requires palletized or enclosed transit; field moisture at ${listing.moisturePercentage}%.`);
  }

  const cropCoeff = CROP_COEFFICIENTS[listing.cropType];
  const co2SavedKg = Math.round(matchedTonnes * cropCoeff.co2AbatementTonnesPerTonne * 1000);

  const breakdown: MatchScoreBreakdown = {
    distanceScore,
    quantityScore,
    priceViabilityScore,
    qualityScore,
    totalScore,
    reasons,
  };

  return {
    id: `match-${listing.id}-${demand.id}`,
    listingId: listing.id,
    demandId: demand.id,
    listing,
    demand,
    matchScore: totalScore,
    distanceKm,
    recommendedVehicle: vehicle,
    estimatedFreightPerTonne: cost.freightPerTonne,
    farmgatePricePerTonne: listing.expectedPricePerTonne,
    estimatedDeliveredPricePerTonne: cost.deliveredPricePerTonne,
    buyerMarginPerTonne,
    totalDeliveredCost: cost.totalDeliveredCost,
    breakdown,
    co2SavedKg,
  };
}

/**
 * Finds and ranks all compatible listings for a given buyer demand.
 */
export function findMatchesForDemand(
  demand: BuyerDemand,
  listings: ResidueListing[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const listing of listings) {
    const result = evaluateMatch(listing, demand);
    if (result) {
      matches.push(result);
    }
  }

  // Sort descending by matchScore
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Finds and ranks all potential buyer demands for a given farmer listing.
 */
export function findMatchesForListing(
  listing: ResidueListing,
  demands: BuyerDemand[]
): MatchResult[] {
  const matches: MatchResult[] = [];

  for (const demand of demands) {
    const result = evaluateMatch(listing, demand);
    if (result) {
      matches.push(result);
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
