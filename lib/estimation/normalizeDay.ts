import type { ActivityCategory } from '../types';
import { CATEGORY_ORDER } from '../taxonomy';

// Plausibility floors so adjustment stacking can never push a category to an
// implausible near-zero. Deficits created by enforcing a floor are
// redistributed proportionally across the non-floored categories.
const FLOORS: Partial<Record<ActivityCategory, number>> = {
  sleep: 240,
  personal_care: 15,
  eating: 15,
};

const TOTAL_MINUTES = 1440;

// Two-pass proportional rescale ("raking-lite") so a day always sums to
// exactly 1440 minutes after adjustment factors are applied, without
// letting floor enforcement quietly break the total.
export function normalizeDay(minutes: Record<ActivityCategory, number>): Record<ActivityCategory, number> {
  let working: Record<ActivityCategory, number> = { ...minutes };

  for (let pass = 0; pass < 3; pass++) {
    const total = CATEGORY_ORDER.reduce((sum, c) => sum + Math.max(working[c] ?? 0, 0), 0);
    if (total <= 0) break;

    const scale = TOTAL_MINUTES / total;
    const scaled: Record<ActivityCategory, number> = { ...working };
    let deficit = 0;
    const flexible: ActivityCategory[] = [];

    for (const c of CATEGORY_ORDER) {
      const v = Math.max(working[c] ?? 0, 0) * scale;
      const floor = FLOORS[c];
      if (floor !== undefined && v < floor) {
        deficit += floor - v;
        scaled[c] = floor;
      } else {
        scaled[c] = v;
        flexible.push(c);
      }
    }

    if (deficit > 0 && flexible.length > 0) {
      const flexTotal = flexible.reduce((sum, c) => sum + scaled[c], 0);
      if (flexTotal > deficit) {
        for (const c of flexible) {
          scaled[c] -= deficit * (scaled[c] / flexTotal);
        }
      }
    }

    working = scaled;
    const newTotal = CATEGORY_ORDER.reduce((sum, c) => sum + working[c], 0);
    if (Math.abs(newTotal - TOTAL_MINUTES) < 0.5) break;
  }

  // Final rounding correction: any residual drift goes to the single
  // largest category, where a minute or two is imperceptible.
  const total = CATEGORY_ORDER.reduce((sum, c) => sum + working[c], 0);
  const diff = TOTAL_MINUTES - total;
  const largest = CATEGORY_ORDER.reduce((a, b) => (working[a] > working[b] ? a : b));
  working[largest] += diff;

  return working;
}
