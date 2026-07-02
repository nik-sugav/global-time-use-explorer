'use client';

import { useEffect, useState } from 'react';
import { useFilterState } from '@/lib/state/useFilterState';
import { useDayProfile } from '@/lib/data/useDayProfile';
import { loadManifest } from '@/lib/data/loadData';
import type { CountryMeta } from '@/lib/types';
import { FilterPanel } from './FilterPanel';
import { ComparisonToggle } from './ComparisonToggle';
import { ProfileSummaryHeader } from './ProfileSummaryHeader';
import { RadialClockView } from '@/components/viz/RadialClockView';
import { TimelineView } from '@/components/viz/TimelineView';
import { SummaryCharts } from '@/components/viz/SummaryCharts';
import { TrendView } from '@/components/viz/TrendView';
import { MethodologyPanel } from '@/components/data-quality/MethodologyPanel';

type Tab = 'dashboard' | 'trends';

export function ExploreClient() {
  const { primary, comparison, compareEnabled, updatePrimary, updateComparison, setCompareEnabled } = useFilterState();
  const primaryState = useDayProfile(primary);
  const comparisonState = useDayProfile(comparison);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [playing, setPlaying] = useState(true);
  const [countries, setCountries] = useState<CountryMeta[]>([]);

  useEffect(() => {
    loadManifest()
      .then((m) => setCountries(m.countries))
      .catch(() => setCountries([]));
  }, []);

  const primaryCountryMeta = countries.find((c) => c.iso3 === primary.country);
  const comparisonCountryMeta = countries.find((c) => c.iso3 === comparison.country);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Global Time Use Explorer</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          How an average person spends their 24-hour day — drillable by country, age, gender, employment, education,
          income, and urban/rural setting. Grounded in real time-use survey data, with transparent estimation where
          direct data doesn&apos;t exist.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FilterPanel filters={primary} onChange={updatePrimary} titlePrefix={compareEnabled ? 'Profile A' : undefined} />
        {compareEnabled && <FilterPanel filters={comparison} onChange={updateComparison} titlePrefix="Profile B" />}
      </div>

      <ComparisonToggle enabled={compareEnabled} onChange={setCompareEnabled} />

      <nav className="flex gap-4 border-b border-neutral-200 text-sm">
        {(['dashboard', 'trends'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-1 pb-2 capitalize ${
              tab === t ? 'border-neutral-800 font-medium text-neutral-900' : 'border-transparent text-neutral-400'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <div className={`grid grid-cols-1 gap-8 ${compareEnabled ? 'md:grid-cols-2' : ''}`}>
          <section className="space-y-4">
            <ProfileSummaryHeader profile={primaryState.profile} countryMeta={primaryCountryMeta} />
            <div className="flex justify-center">
              <RadialClockView profile={primaryState.profile} playing={playing} />
            </div>
            <TimelineView profile={primaryState.profile} />
            <SummaryCharts profile={primaryState.profile} />
          </section>
          {compareEnabled && (
            <section className="space-y-4">
              <ProfileSummaryHeader profile={comparisonState.profile} countryMeta={comparisonCountryMeta} />
              <div className="flex justify-center">
                <RadialClockView profile={comparisonState.profile} playing={playing} />
              </div>
              <TimelineView profile={comparisonState.profile} />
              <SummaryCharts profile={comparisonState.profile} />
            </section>
          )}
          {!compareEnabled && (
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                {playing ? 'Pause day sweep' : 'Play day sweep'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className={`grid grid-cols-1 gap-8 ${compareEnabled ? 'md:grid-cols-2' : ''}`}>
          <section>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">{primaryCountryMeta?.name ?? primary.country}</h3>
            <TrendView country={primary.country} />
          </section>
          {compareEnabled && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">{comparisonCountryMeta?.name ?? comparison.country}</h3>
              <TrendView country={comparison.country} />
            </section>
          )}
        </div>
      )}

      <MethodologyPanel profile={primaryState.profile} />
    </div>
  );
}
