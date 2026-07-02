'use client';

import type { CountryMeta, DayProfile } from '@/lib/types';

export function ProfileSummaryHeader({ profile, countryMeta }: { profile: DayProfile | null; countryMeta?: CountryMeta }) {
  if (!profile) return null;
  const name = profile.filters.country === 'WLD' ? 'World average' : countryMeta?.name ?? profile.filters.country;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h2 className="text-lg font-semibold text-neutral-900">{name}</h2>
      {profile.dataYear && <span className="text-xs text-neutral-400">survey year {profile.dataYear}</span>}
      <span className="text-xs text-neutral-400">Tier {profile.tier}</span>
    </div>
  );
}
