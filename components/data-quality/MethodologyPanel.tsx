'use client';

import { useState } from 'react';
import type { DayProfile } from '@/lib/types';

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — rich real survey microdata for this country',
  2: 'Tier 2 — shallow real survey data (country/gender averages) for this country',
  3: 'Tier 3 — no direct survey data for this country; fully estimated from regional/income-group patterns',
};

export function MethodologyPanel({ profile }: { profile: DayProfile | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-neutral-700"
      >
        <span>How this data was produced</span>
        <span className="text-neutral-400">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-neutral-100 px-4 py-3 text-sm text-neutral-600">
          {profile && <p className="font-medium text-neutral-800">{TIER_LABELS[profile.tier]}</p>}
          {profile?.estimationNote && <p>{profile.estimationNote}</p>}
          <p>
            Every figure in this view is tagged <strong>Measured</strong> (drawn directly from a published survey) or{' '}
            <strong>Estimated</strong> (derived by adjusting the nearest real data point using patterns learned from
            countries with richer survey data), with a confidence band on estimated figures reflecting how many
            source countries agree, how many filters were stacked, and how far the target country is from where the
            pattern was learned. The clock-time placement within the day (when exactly an activity happens) uses a
            typical daily-rhythm template rather than measured minute-by-minute data, even for measured category
            totals.
          </p>
          {profile && profile.citations.length > 0 && (
            <div>
              <p className="font-medium text-neutral-800">Sources for this view</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {profile.citations.map((c) => (
                  <li key={c.id}>
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                      {c.name}
                    </a>{' '}
                    — {c.org}, {c.year} ({c.license})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
