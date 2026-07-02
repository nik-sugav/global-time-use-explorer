import type {
  ActivityCategory,
  AdjustmentDimension,
  AdjustmentFactor,
  BaseSlice,
  CategoryTotal,
  CountryMeta,
  DataManifest,
  DataQuality,
  DayProfile,
  FilterSelection,
} from '../types';
import { CATEGORY_ORDER } from '../taxonomy';
import { composeAdjustments } from '../estimation/composeAdjustments';
import { normalizeDay } from '../estimation/normalizeDay';
import { scoreConfidence } from '../estimation/scoreConfidence';
import { allocateSlots } from './allocateSlots';
import { loadAdjustmentFactors, loadBaseSlices, loadLocationDefaults, loadManifest } from './loadData';

const DIMENSIONS: { key: AdjustmentDimension; filterKey: keyof FilterSelection }[] = [
  { key: 'employment', filterKey: 'employment' },
  { key: 'education', filterKey: 'education' },
  { key: 'income', filterKey: 'income' },
  { key: 'urbanRural', filterKey: 'urbanRural' },
];

function pickBaseSlice(slices: BaseSlice[], filters: FilterSelection): BaseSlice | null {
  if (slices.length === 0) return null;
  const exact = slices.find((s) => s.ageGroup === filters.ageGroup && s.gender === filters.gender);
  if (exact) return exact;
  const ageOnly = slices.find((s) => s.ageGroup === filters.ageGroup && s.gender === 'all');
  if (ageOnly) return ageOnly;
  const genderOnly = slices.find((s) => s.ageGroup === 'all' && s.gender === filters.gender);
  if (genderOnly) return genderOnly;
  const overall = slices.find((s) => s.ageGroup === 'all' && s.gender === 'all');
  return overall ?? slices[0] ?? null;
}

function poolKeyCandidates(countryMeta: CountryMeta | undefined): string[] {
  const candidates: string[] = [];
  if (countryMeta) candidates.push(`income_group:${countryMeta.incomeGroup}`);
  candidates.push('global');
  return candidates;
}

function resolveFactorsForLevel(
  allFactors: AdjustmentFactor[],
  dimension: AdjustmentDimension,
  level: string,
  poolKeys: string[]
): { factors: AdjustmentFactor[]; usedGlobalFallback: boolean } {
  for (let i = 0; i < poolKeys.length; i++) {
    const poolKey = poolKeys[i];
    const matches = allFactors.filter((f) => f.dimension === dimension && f.level === level && f.poolKey === poolKey);
    if (matches.length > 0) {
      return { factors: matches, usedGlobalFallback: poolKey === 'global' && i > 0 };
    }
  }
  return { factors: [], usedGlobalFallback: false };
}

export async function resolveProfile(filters: FilterSelection): Promise<DayProfile> {
  const manifest = await loadManifest();
  const countryMeta = manifest.countries.find((c) => c.iso3 === filters.country);

  const [slices, locationDefaults, ...factorLists] = await Promise.all([
    loadBaseSlices(filters.country),
    loadLocationDefaults(),
    ...DIMENSIONS.map((d) => loadAdjustmentFactors(d.key)),
  ]);

  const factorsByDimension = new Map<AdjustmentDimension, AdjustmentFactor[]>();
  DIMENSIONS.forEach((d, i) => factorsByDimension.set(d.key, factorLists[i] as AdjustmentFactor[]));

  const base = pickBaseSlice(slices, filters);
  const tier = base?.tier ?? 3;
  const baseMinutes: Record<ActivityCategory, number> = { ...emptyCategoryRecord(), ...(base?.categoryMinutes ?? {}) };
  const baseQuality: Record<ActivityCategory, DataQuality> = {} as Record<ActivityCategory, DataQuality>;
  for (const c of CATEGORY_ORDER) {
    baseQuality[c] = base?.categoryQuality?.[c] ?? (tier === 1 ? 'measured' : 'estimated');
  }

  const activeFactors: AdjustmentFactor[] = [];
  let usedGlobalFallback = false;
  const poolKeys = poolKeyCandidates(countryMeta);
  const appliedDimensions: string[] = [];

  for (const d of DIMENSIONS) {
    const level = filters[d.filterKey];
    if (!level || level === 'all') continue;
    const dimFactors = factorsByDimension.get(d.key) ?? [];
    const { factors, usedGlobalFallback: fallback } = resolveFactorsForLevel(dimFactors, d.key, level, poolKeys);
    if (factors.length > 0) {
      activeFactors.push(...factors);
      appliedDimensions.push(`${d.key}=${level}`);
      if (fallback) usedGlobalFallback = true;
    }
  }

  const { minutes: adjustedMinutes, appliedByCategory } = composeAdjustments(
    baseMinutes,
    activeFactors,
    (f) => 1 / (1 + f.standardError) // agreement proxy: tighter cross-country spread -> higher agreement
  );
  const finalMinutes = normalizeDay(adjustedMinutes);

  const categoryTotals: CategoryTotal[] = CATEGORY_ORDER.map((category) => {
    const applied = appliedByCategory[category] ?? [];
    const isMeasured = baseQuality[category] === 'measured' && applied.length === 0;
    const quality: DataQuality = isMeasured ? 'measured' : 'estimated';
    const sourceIds = isMeasured ? base?.sourceIds ?? [] : [...(base?.sourceIds ?? [])];

    if (quality === 'measured') {
      return { category, minutes: finalMinutes[category], quality, sourceIds };
    }
    const { score, band } = scoreConfidence(tier, applied, usedGlobalFallback);
    return {
      category,
      minutes: finalMinutes[category],
      quality,
      confidence: band,
      confidenceScore: score,
      sourceIds,
    };
  });

  const qualityByCategory: Record<ActivityCategory, DataQuality> = {} as Record<ActivityCategory, DataQuality>;
  categoryTotals.forEach((ct) => (qualityByCategory[ct.category] = ct.quality));

  const slots = allocateSlots(finalMinutes, qualityByCategory, locationDefaults);

  const usedSourceIds = new Set(categoryTotals.flatMap((ct) => ct.sourceIds));
  const citations = manifest.citations.filter((c) => usedSourceIds.has(c.id));

  return {
    filters,
    tier,
    slots,
    categoryTotals,
    citations,
    dataYear: base?.dataYear ?? null,
    estimationNote:
      appliedDimensions.length > 0
        ? `Adjusted from the ${filters.country} base rate for: ${appliedDimensions.join(', ')}.`
        : undefined,
  };
}

function emptyCategoryRecord(): Record<ActivityCategory, number> {
  return Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<ActivityCategory, number>;
}

export type { DataManifest };
