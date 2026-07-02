import type {
  AdjustmentDimension,
  AdjustmentFactor,
  BaseSlice,
  CountryTrend,
  DataManifest,
  LocationContext,
  ActivityCategory,
} from '../types';

const manifestCache = new Map<string, Promise<DataManifest>>();
const baseSliceCache = new Map<string, Promise<BaseSlice[]>>();
const factorCache = new Map<AdjustmentDimension, Promise<AdjustmentFactor[]>>();
const trendCache = new Map<string, Promise<CountryTrend | null>>();
let locationDefaultsPromise: Promise<Record<ActivityCategory, LocationContext>> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function loadManifest(): Promise<DataManifest> {
  const key = 'manifest';
  if (!manifestCache.has(key)) {
    manifestCache.set(key, fetchJson<DataManifest>('/data/manifest.json'));
  }
  return manifestCache.get(key)!;
}

export function loadBaseSlices(iso3: string): Promise<BaseSlice[]> {
  if (!baseSliceCache.has(iso3)) {
    const path = iso3 === 'WLD' ? '/data/world-average.json' : `/data/base-slices/${iso3}.json`;
    baseSliceCache.set(
      iso3,
      fetchJson<BaseSlice[]>(path).catch(() => [])
    );
  }
  return baseSliceCache.get(iso3)!;
}

export function loadAdjustmentFactors(dimension: AdjustmentDimension): Promise<AdjustmentFactor[]> {
  if (!factorCache.has(dimension)) {
    factorCache.set(
      dimension,
      fetchJson<AdjustmentFactor[]>(`/data/adjustment-factors/${dimension}.json`).catch(() => [])
    );
  }
  return factorCache.get(dimension)!;
}

export function loadLocationDefaults(): Promise<Record<ActivityCategory, LocationContext>> {
  if (!locationDefaultsPromise) {
    locationDefaultsPromise = fetchJson<Record<ActivityCategory, LocationContext>>('/data/location-defaults.json');
  }
  return locationDefaultsPromise;
}

export function loadTrend(iso3: string): Promise<CountryTrend | null> {
  if (!trendCache.has(iso3)) {
    trendCache.set(
      iso3,
      fetchJson<CountryTrend>(`/data/trends/${iso3}.json`).catch(() => null)
    );
  }
  return trendCache.get(iso3)!;
}
