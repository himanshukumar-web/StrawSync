'use client';

import React from 'react';
import { LandAreaUnit } from '../types';
import { toAcres } from '../lib/store';

export const LAND_UNIT_OPTIONS: Array<{
  key: LandAreaUnit;
  label: string;
  note: string;
}> = [
  { key: 'acre', label: 'Acres', note: '1 Acre standard' },
  { key: 'bigha', label: 'Bigha', note: '1 Bigha = 0.625 Acre (1.6 Bigha = 1 Acre)' },
  { key: 'hectare', label: 'Hectare', note: '1 Hectare = 2.47105 Acres' },
  { key: 'kanal', label: 'Kanal', note: '1 Kanal = 0.125 Acre (8 Kanal = 1 Acre)' },
  { key: 'guntha', label: 'Guntha', note: '1 Guntha = 0.025 Acre (40 Guntha = 1 Acre)' },
];

interface Props {
  value: string;
  unit: LandAreaUnit;
  onChangeValue: (val: string) => void;
  onChangeUnit: (unit: LandAreaUnit) => void;
  label?: string;
  rightAction?: React.ReactNode;
}

export default function LandAreaField({
  value,
  unit,
  onChangeValue,
  onChangeUnit,
  label = 'Farmland Area',
  rightAction,
}: Props) {
  const numericVal = value === '' ? 0 : Math.max(0, Number(value) || 0);
  const acresEquivalent = toAcres(numericVal, unit);
  const unitMeta = LAND_UNIT_OPTIONS.find((u) => u.key === unit);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="block text-[11px] font-bold text-charcoal-muted uppercase">
          {label}
        </label>
        {rightAction}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step="any"
          placeholder="0"
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChangeValue('');
              return;
            }
            const parsed = Number(raw);
            if (!Number.isNaN(parsed) && parsed >= 0) {
              onChangeValue(raw);
            }
          }}
          className="w-full px-3 py-2 bg-white border border-earth-border rounded-xl text-xs font-semibold text-charcoal focus:outline-none focus:border-forest"
        />
        <select
          value={unit}
          onChange={(e) => onChangeUnit(e.target.value as LandAreaUnit)}
          className="w-32 shrink-0 px-2.5 py-2 bg-sand border border-earth-border rounded-xl text-xs font-bold text-charcoal focus:outline-none focus:border-forest"
        >
          {LAND_UNIT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {unit !== 'acre' && (
        <div className="mt-1 text-[10px] text-forest font-semibold flex flex-wrap items-center justify-between gap-1">
          <span>= {acresEquivalent} Acres</span>
          <span className="text-charcoal-muted font-normal">{unitMeta?.note}</span>
        </div>
      )}
    </div>
  );
}
