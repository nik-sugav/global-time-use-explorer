'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { CategoryTotal } from '@/lib/types';

const BAND_STYLES: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-300',
  low: 'bg-rose-100 text-rose-800 border-rose-300',
};

export function DataQualityBadge({ categoryTotal, explanation }: { categoryTotal: CategoryTotal; explanation?: string }) {
  const [open, setOpen] = useState(false);

  if (categoryTotal.quality === 'measured') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
        Measured
      </span>
    );
  }

  const band = categoryTotal.confidence ?? 'low';

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
          BAND_STYLES[band]
        )}
      >
        Estimated · {band}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-[min(16rem,80vw)] rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-700 shadow-lg">
          {explanation ?? 'This figure is derived by adjusting the nearest real data point using patterns learned from countries with richer survey data.'}
          {typeof categoryTotal.confidenceScore === 'number' && (
            <div className="mt-1 text-neutral-400">confidence score: {categoryTotal.confidenceScore.toFixed(2)}</div>
          )}
        </div>
      )}
    </span>
  );
}
