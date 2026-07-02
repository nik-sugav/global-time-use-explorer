// Core data contracts shared between the build-time data pipeline
// (scripts/build-data.ts and friends) and the runtime app. Keeping this as
// the single source of truth is what lets resolveProfile() run identically
// at build time (to precompute world-average.json) and in the browser (to
// apply adjustment factors on filter change) with zero drift.

export type ActivityCategory =
  | 'sleep'
  | 'personal_care'
  | 'eating'
  | 'paid_work'
  | 'education'
  | 'household'
  | 'caregiving'
  | 'shopping'
  | 'commute'
  | 'screen_leisure'
  | 'socializing'
  | 'exercise'
  | 'civic_religious'
  | 'other';

export type LocationContext =
  | 'home'
  | 'workplace'
  | 'school'
  | 'someone_elses_home'
  | 'transit'
  | 'other_public'
  | 'unknown';

export type DataQuality = 'measured' | 'estimated';
export type ConfidenceBand = 'high' | 'medium' | 'low';
export type DataTier = 1 | 2 | 3;

export type AgeGroup = 'all' | '15-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type Gender = 'all' | 'male' | 'female';
export type EmploymentStatus = 'all' | 'employed' | 'unemployed' | 'not_in_labor_force' | 'retired' | 'student';
export type EducationLevel = 'all' | 'below_secondary' | 'secondary' | 'tertiary';
export type IncomeLevel = 'all' | 'low' | 'middle' | 'high';
export type UrbanRural = 'all' | 'urban' | 'rural';
export type WorldBankIncomeGroup = 'low' | 'lower_middle' | 'upper_middle' | 'high';

export interface FilterSelection {
  country: string; // ISO3, or 'WLD' for world average
  ageGroup: AgeGroup;
  gender: Gender;
  employment: EmploymentStatus;
  education: EducationLevel;
  income: IncomeLevel;
  urbanRural: UrbanRural;
}

export const DEFAULT_FILTER: FilterSelection = {
  country: 'WLD',
  ageGroup: 'all',
  gender: 'all',
  employment: 'all',
  education: 'all',
  income: 'all',
  urbanRural: 'all',
};

export interface SourceCitation {
  id: string;
  name: string;
  org: string;
  url: string;
  year: number;
  license: string;
}

export interface CategoryTotal {
  category: ActivityCategory;
  minutes: number; // 0-1440, all categories in a profile sum to 1440
  quality: DataQuality;
  confidence?: ConfidenceBand; // present when quality === 'estimated'
  confidenceScore?: number; // raw 0-1 score backing the band, for the "why" detail
  sourceIds: string[];
}

export interface TimeSlot {
  slotIndex: number; // 0-95, each slot = 15 minutes, slot 0 = 00:00-00:15
  category: ActivityCategory;
  location: LocationContext;
  quality: DataQuality;
}

export interface DayProfile {
  filters: FilterSelection;
  tier: DataTier;
  slots: TimeSlot[]; // length 96
  categoryTotals: CategoryTotal[]; // length === number of ActivityCategory values
  citations: SourceCitation[];
  dataYear: number | null; // vintage of the underlying real survey, null if fully synthetic
  estimationNote?: string; // human-readable explanation when tier !== 1, e.g. which factors were stacked
}

// ---- Build-time pipeline shapes ----

// One real (or Tier-3-proxy) data point: country x age x gender, the
// coarsest grid that's precomputed in full at build time. Everything finer
// (employment/education/income/urbanRural) is layered on at runtime via
// AdjustmentFactor.
export interface BaseSlice {
  country: string; // ISO3
  ageGroup: AgeGroup;
  gender: Gender;
  tier: DataTier;
  categoryMinutes: Record<ActivityCategory, number>;
  // Per-category override of measured-vs-estimated, for Tier-2 sources like
  // OECD's 5-bucket data where the bucket total is measured but splitting it
  // into our 14 categories relies on Tier-1-derived internal ratios. Falls
  // back to tier-based inference (tier 1 = measured, else estimated) for any
  // category not listed here.
  categoryQuality?: Partial<Record<ActivityCategory, DataQuality>>;
  sourceIds: string[];
  dataYear: number | null;
  shapeSourceCountry?: string; // ISO3 of the Tier-1 country whose intraday shape curve was borrowed, if any
}

export type AdjustmentDimension = 'employment' | 'education' | 'income' | 'urbanRural';

// A single learned deviation: "compared to the pool's grand mean, this
// demographic value shifts a category by this much." Derived exclusively
// from Tier-1 microdata (see scripts/estimation/tier1-extract.ts), pooled
// per PoolKey per the hierarchical-backoff scheme in the methodology.
export interface AdjustmentFactor {
  dimension: AdjustmentDimension;
  level: string; // e.g. 'employed', 'tertiary', 'high', 'urban'
  poolKey: string; // 'income_group:high' | 'income_group:upper_middle' | ... | 'global'
  category: ActivityCategory;
  form: 'ratio' | 'delta';
  value: number; // ratio: multiplier around 1.0; delta: minutes/day
  standardError: number;
  nCountries: number;
}

export interface CountryMeta {
  iso3: string;
  name: string;
  region: string;
  incomeGroup: WorldBankIncomeGroup;
  tier: DataTier;
  dataYear: number | null;
  sourceIds: string[];
  population?: number; // for population-weighted world-average blending
}

export interface DataManifest {
  version: string;
  generatedAt: string;
  countries: CountryMeta[];
  categories: ActivityCategory[];
  citations: SourceCitation[];
}

export interface TrendPoint {
  year: number;
  categoryMinutes: Record<ActivityCategory, number>;
  sourceId: string;
}

export interface CountryTrend {
  country: string;
  points: TrendPoint[]; // real measured wave-years only, never interpolated
  smoothedAvailable: boolean; // true only for dense-annual sources like US ATUS
}
