import type { ActivityCategory, DataQuality, LocationContext, TimeSlot } from '../types';
import { CATEGORY_ORDER } from '../taxonomy';
import { SHAPE_TEMPLATES } from './shapeTemplates';

const SLOTS = 96;
const MINUTES_PER_SLOT = 15;

// Largest Remainder Method: convert category minutes into integer slot
// quotas that sum to exactly 96, distributing rounding remainders to the
// categories with the largest fractional part first.
function apportionSlotQuotas(minutes: Record<ActivityCategory, number>): Record<ActivityCategory, number> {
  const raw = CATEGORY_ORDER.map((c) => ({ category: c, exact: (minutes[c] ?? 0) / MINUTES_PER_SLOT }));
  const floors = raw.map((r) => ({ ...r, floor: Math.floor(r.exact), remainder: r.exact - Math.floor(r.exact) }));
  let assigned = floors.reduce((s, f) => s + f.floor, 0);
  let remaining = SLOTS - assigned;

  const byRemainder = [...floors].sort((a, b) => b.remainder - a.remainder);
  const quotas: Record<ActivityCategory, number> = {} as Record<ActivityCategory, number>;
  for (const f of floors) quotas[f.category] = f.floor;

  for (let i = 0; i < byRemainder.length && remaining > 0; i++) {
    const entry = byRemainder[i];
    if (!entry) continue;
    quotas[entry.category] += 1;
    remaining -= 1;
  }
  return quotas;
}

// Greedy max-weight assignment: score every (slot, category) pair by the
// category's shape-template weight at that slot, sort all pairs
// descending, then assign each slot to the highest-scoring category that
// still has quota remaining. Produces visually coherent contiguous blocks
// since shape templates are smooth unimodal-ish curves.
export function allocateSlots(
  minutes: Record<ActivityCategory, number>,
  quality: Record<ActivityCategory, DataQuality>,
  locationDefaults: Record<ActivityCategory, LocationContext>
): TimeSlot[] {
  const quotas = apportionSlotQuotas(minutes);

  const pairs: { slot: number; category: ActivityCategory; score: number }[] = [];
  for (const category of CATEGORY_ORDER) {
    const shape = SHAPE_TEMPLATES[category];
    for (let slot = 0; slot < SLOTS; slot++) {
      pairs.push({ slot, category, score: shape[slot] ?? 0 });
    }
  }
  pairs.sort((a, b) => b.score - a.score);

  const slotAssignment: (ActivityCategory | null)[] = new Array(SLOTS).fill(null);
  const remainingQuota = { ...quotas };
  let unassignedCount = SLOTS;

  for (const pair of pairs) {
    if (unassignedCount === 0) break;
    if (slotAssignment[pair.slot] !== null) continue;
    if ((remainingQuota[pair.category] ?? 0) <= 0) continue;
    slotAssignment[pair.slot] = pair.category;
    remainingQuota[pair.category] -= 1;
    unassignedCount -= 1;
  }

  // Fallback pass: any category with leftover quota (can happen with
  // extreme rounding ties) fills any still-unassigned slot in order.
  if (unassignedCount > 0) {
    for (let slot = 0; slot < SLOTS; slot++) {
      if (slotAssignment[slot] !== null) continue;
      const category = CATEGORY_ORDER.find((c) => (remainingQuota[c] ?? 0) > 0);
      if (!category) break;
      slotAssignment[slot] = category;
      remainingQuota[category] -= 1;
    }
  }

  return slotAssignment.map((category, slotIndex) => {
    const resolvedCategory = category ?? 'other';
    return {
      slotIndex,
      category: resolvedCategory,
      location: locationDefaults[resolvedCategory] ?? 'unknown',
      quality: quality[resolvedCategory] ?? 'estimated',
    };
  });
}
