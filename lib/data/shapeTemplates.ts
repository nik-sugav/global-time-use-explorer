import type { ActivityCategory } from '../types';

const SLOTS = 96;

interface Peak {
  hour: number; // 0-24 (24h clock)
  spreadHours: number;
  weight: number;
}

function circularDistanceHours(a: number, b: number): number {
  const diff = Math.abs(a - b) % 24;
  return Math.min(diff, 24 - diff);
}

function buildShape(peaks: Peak[]): number[] {
  const raw = new Array(SLOTS).fill(0);
  for (let slot = 0; slot < SLOTS; slot++) {
    const hour = slot * 0.25 + 0.125; // slot midpoint
    let value = 0;
    for (const peak of peaks) {
      const d = circularDistanceHours(hour, peak.hour % 24);
      value += peak.weight * Math.exp(-(d * d) / (2 * peak.spreadHours * peak.spreadHours));
    }
    raw[slot] = value;
  }
  const total = raw.reduce((s, v) => s + v, 0);
  return raw.map((v) => v / total);
}

// Illustrative "typical daily rhythm" curves used only to place each
// category's real/estimated TOTAL minutes at plausible clock times on the
// timeline and radial clock views. These are NOT survey-measured slot-level
// data — the category totals are the evidence-backed numbers; the shape is
// a reasonable default pattern. The UI labels this distinction explicitly.
export const SHAPE_TEMPLATES: Record<ActivityCategory, number[]> = {
  sleep: buildShape([{ hour: 3, spreadHours: 3.2, weight: 1 }]),
  personal_care: buildShape([
    { hour: 7, spreadHours: 1.2, weight: 0.6 },
    { hour: 21.5, spreadHours: 1.3, weight: 0.4 },
  ]),
  eating: buildShape([
    { hour: 7.5, spreadHours: 0.6, weight: 0.25 },
    { hour: 12.5, spreadHours: 0.7, weight: 0.4 },
    { hour: 19, spreadHours: 0.8, weight: 0.35 },
  ]),
  paid_work: buildShape([{ hour: 13, spreadHours: 4.2, weight: 1 }]),
  education: buildShape([{ hour: 11.5, spreadHours: 3.5, weight: 1 }]),
  household: buildShape([
    { hour: 8, spreadHours: 1.5, weight: 0.45 },
    { hour: 18.5, spreadHours: 1.8, weight: 0.55 },
  ]),
  caregiving: buildShape([
    { hour: 7.5, spreadHours: 1.2, weight: 0.4 },
    { hour: 17.5, spreadHours: 2, weight: 0.6 },
  ]),
  shopping: buildShape([
    { hour: 12, spreadHours: 2, weight: 0.4 },
    { hour: 18, spreadHours: 1.8, weight: 0.6 },
  ]),
  commute: buildShape([
    { hour: 8.25, spreadHours: 0.8, weight: 0.5 },
    { hour: 17.75, spreadHours: 1, weight: 0.5 },
  ]),
  screen_leisure: buildShape([{ hour: 20.5, spreadHours: 2.3, weight: 1 }]),
  socializing: buildShape([{ hour: 19.5, spreadHours: 2.5, weight: 1 }]),
  exercise: buildShape([
    { hour: 7, spreadHours: 1.3, weight: 0.5 },
    { hour: 18, spreadHours: 1.5, weight: 0.5 },
  ]),
  civic_religious: buildShape([
    { hour: 10.5, spreadHours: 2.5, weight: 0.4 },
    { hour: 19, spreadHours: 2, weight: 0.6 },
  ]),
  other: new Array(SLOTS).fill(1 / SLOTS),
};
