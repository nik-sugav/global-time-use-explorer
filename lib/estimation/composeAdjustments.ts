import type { ActivityCategory, AdjustmentFactor } from '../types';
import { CATEGORY_ORDER } from '../taxonomy';

export interface AppliedFactorSummary {
  dimension: string;
  level: string;
  category: ActivityCategory;
  logRatio: number;
  agreement: number; // 0-1, derived from cross-country coefficient of variation at factor-derivation time
}

export interface ComposeResult {
  minutes: Record<ActivityCategory, number>;
  appliedByCategory: Record<ActivityCategory, AppliedFactorSummary[]>;
}

// Damped log-linear composition: stacked filters on the same category are
// combined in log-space, weighted by 1/sqrt(rank) after sorting by effect
// size, so correlated filters (e.g. age=65+ and employment=retired) don't
// naively multiply into an implausibly large combined effect.
export function composeAdjustments(
  baseMinutes: Record<ActivityCategory, number>,
  activeFactors: AdjustmentFactor[],
  agreementByFactor: (f: AdjustmentFactor) => number
): ComposeResult {
  const byCategory = new Map<ActivityCategory, AdjustmentFactor[]>();
  for (const f of activeFactors) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  const minutes = { ...baseMinutes };
  const appliedByCategory = {} as Record<ActivityCategory, AppliedFactorSummary[]>;

  for (const category of CATEGORY_ORDER) {
    const base = baseMinutes[category] ?? 0;
    const catFactors = byCategory.get(category) ?? [];
    appliedByCategory[category] = [];
    if (catFactors.length === 0 || base <= 0) continue;

    const entries = catFactors.map((f) => {
      let logRatio: number;
      if (f.form === 'ratio') {
        logRatio = Math.log(Math.max(f.value, 0.01));
      } else {
        const implied = (base + f.value) / base;
        logRatio = Math.log(Math.max(implied, 0.01));
      }
      return { factor: f, logRatio, agreement: agreementByFactor(f) };
    });

    entries.sort((a, b) => Math.abs(b.logRatio) - Math.abs(a.logRatio));

    let logAdjustment = 0;
    entries.forEach((entry, i) => {
      const weight = 1 / Math.sqrt(i + 1);
      logAdjustment += weight * entry.logRatio;
      appliedByCategory[category].push({
        dimension: entry.factor.dimension,
        level: entry.factor.level,
        category,
        logRatio: entry.logRatio,
        agreement: entry.agreement,
      });
    });

    minutes[category] = base * Math.exp(logAdjustment);
  }

  return { minutes, appliedByCategory };
}
