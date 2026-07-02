'use client';

import { useEffect, useState } from 'react';
import type { CountryMeta, FilterSelection } from '@/lib/types';
import { loadManifest } from '@/lib/data/loadData';

const AGE_OPTIONS: { value: FilterSelection['ageGroup']; label: string }[] = [
  { value: 'all', label: 'All ages' },
  { value: '15-24', label: '15–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55-64', label: '55–64' },
  { value: '65+', label: '65+' },
];

const GENDER_OPTIONS: { value: FilterSelection['gender']; label: string }[] = [
  { value: 'all', label: 'All genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const EMPLOYMENT_OPTIONS: { value: FilterSelection['employment']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'not_in_labor_force', label: 'Not in labor force' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
];

const EDUCATION_OPTIONS: { value: FilterSelection['education']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'below_secondary', label: 'Below secondary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary', label: 'Tertiary' },
];

const INCOME_OPTIONS: { value: FilterSelection['income']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low income' },
  { value: 'middle', label: 'Middle income' },
  { value: 'high', label: 'High income' },
];

const URBAN_OPTIONS: { value: FilterSelection['urbanRural']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'urban', label: 'Urban' },
  { value: 'rural', label: 'Rural' },
];

function tierBadge(tier?: number) {
  if (!tier) return null;
  const label = tier === 1 ? 'Rich data' : tier === 2 ? 'Basic data' : 'Estimated only';
  const style = tier === 1 ? 'text-emerald-700' : tier === 2 ? 'text-amber-700' : 'text-rose-700';
  return <span className={`ml-1 text-xs ${style}`}>({label})</span>;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <select
        className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-neutral-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterPanel({
  filters,
  onChange,
  titlePrefix,
}: {
  filters: FilterSelection;
  onChange: (patch: Partial<FilterSelection>) => void;
  titlePrefix?: string;
}) {
  const [countries, setCountries] = useState<CountryMeta[]>([]);

  useEffect(() => {
    loadManifest()
      .then((m) => setCountries([...m.countries].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setCountries([]));
  }, []);

  const currentCountry = countries.find((c) => c.iso3 === filters.country);

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      {titlePrefix && <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{titlePrefix}</p>}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">
          Country / region {currentCountry && tierBadge(currentCountry.tier)}
        </span>
        <select
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-neutral-800"
          value={filters.country}
          onChange={(e) => onChange({ country: e.target.value })}
        >
          <option value="WLD">World average</option>
          {countries.map((c) => (
            <option key={c.iso3} value={c.iso3}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Age group" value={filters.ageGroup} options={AGE_OPTIONS} onChange={(v) => onChange({ ageGroup: v as FilterSelection['ageGroup'] })} />
        <Select label="Gender" value={filters.gender} options={GENDER_OPTIONS} onChange={(v) => onChange({ gender: v as FilterSelection['gender'] })} />
        <Select label="Employment" value={filters.employment} options={EMPLOYMENT_OPTIONS} onChange={(v) => onChange({ employment: v as FilterSelection['employment'] })} />
        <Select label="Education" value={filters.education} options={EDUCATION_OPTIONS} onChange={(v) => onChange({ education: v as FilterSelection['education'] })} />
        <Select label="Income" value={filters.income} options={INCOME_OPTIONS} onChange={(v) => onChange({ income: v as FilterSelection['income'] })} />
        <Select label="Urban / rural" value={filters.urbanRural} options={URBAN_OPTIONS} onChange={(v) => onChange({ urbanRural: v as FilterSelection['urbanRural'] })} />
      </div>
    </div>
  );
}
