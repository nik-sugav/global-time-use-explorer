// Build-time data assembly pipeline. Reads the raw fetched-and-transformed
// outputs from data/sources/* and data/countries/*, and produces the static
// JSON the app reads at runtime under public/data/.
//
// Run with `npm run build:data` (also runs automatically before `next build`).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ActivityCategory,
  AdjustmentDimension,
  AdjustmentFactor,
  BaseSlice,
  CountryMeta,
  CountryTrend,
  DataManifest,
  DataQuality,
  DataTier,
  LocationContext,
  SourceCitation,
  WorldBankIncomeGroup,
} from '../lib/types';
import { CATEGORY_ORDER } from '../lib/taxonomy';

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'public', 'data');

async function readJson<T>(relPath: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, relPath), 'utf-8');
  return JSON.parse(raw) as T;
}

async function tryReadJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    return await readJson<T>(relPath);
  } catch {
    return fallback;
  }
}

function emptyMinutes(): Record<ActivityCategory, number> {
  return Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<ActivityCategory, number>;
}

function sumMinutes(m: Record<ActivityCategory, number>, keys: ActivityCategory[]): number {
  return keys.reduce((s, k) => s + (m[k] ?? 0), 0);
}

function splitBucket(
  bucketTotal: number,
  keys: ActivityCategory[],
  ratios: Record<ActivityCategory, number>
): Record<ActivityCategory, number> {
  const out: Partial<Record<ActivityCategory, number>> = {};
  for (const k of keys) out[k] = bucketTotal * (ratios[k] ?? 0);
  return out as Record<ActivityCategory, number>;
}

// ---- ATUS (Tier 1) shapes, as requested from the fetch agent ----
interface AtusBaseSliceRow {
  ageGroup: string;
  gender: string;
  categoryMinutes: Record<string, number>;
  sampleNote?: string;
}
interface AtusCrossTabRow {
  level: string;
  categoryMinutes: Record<string, number>;
  sampleNote?: string;
}
interface AtusCrossTabs {
  employment: AtusCrossTabRow[];
  education: AtusCrossTabRow[];
  income: AtusCrossTabRow[];
}

// ---- OECD (Tier 2, 5-bucket) shape ----
interface OecdRow {
  country: string;
  gender: 'all' | 'male' | 'female';
  categoryMinutes: {
    paid_work_or_study: number;
    unpaid_work: number;
    personal_care: number;
    leisure: number;
    other: number;
  };
  dataYear: number;
}

// ---- UN SDG 5.4.1 shape ----
interface UnSdgRow {
  country: string;
  sex: 'male' | 'female' | 'all';
  urbanRural: 'urban' | 'rural' | 'all';
  unpaidCareWorkMinutesPerDay: number;
  dataYear: number;
  ageGroup?: string;
}

const BUCKET_MEMBERS: Record<keyof OecdRow['categoryMinutes'], ActivityCategory[]> = {
  paid_work_or_study: ['paid_work', 'education'],
  unpaid_work: ['household', 'caregiving', 'shopping'],
  personal_care: ['sleep', 'personal_care', 'eating'],
  leisure: ['screen_leisure', 'socializing', 'exercise', 'civic_religious'],
  other: ['commute', 'other'],
};

function computeInternalRatios(usGrandMean: Record<ActivityCategory, number>) {
  const ratios = {} as Record<keyof OecdRow['categoryMinutes'], Record<ActivityCategory, number>>;
  for (const [bucket, members] of Object.entries(BUCKET_MEMBERS) as [keyof OecdRow['categoryMinutes'], ActivityCategory[]][]) {
    const total = sumMinutes(usGrandMean, members);
    const r: Partial<Record<ActivityCategory, number>> = {};
    for (const m of members) r[m] = total > 0 ? (usGrandMean[m] ?? 0) / total : 1 / members.length;
    ratios[bucket] = r as Record<ActivityCategory, number>;
  }
  return ratios;
}

function oecdRowToCategoryMinutes(
  row: OecdRow,
  ratios: Record<keyof OecdRow['categoryMinutes'], Record<ActivityCategory, number>>
): Record<ActivityCategory, number> {
  const out = emptyMinutes();
  for (const [bucket, members] of Object.entries(BUCKET_MEMBERS) as [keyof OecdRow['categoryMinutes'], ActivityCategory[]][]) {
    const split = splitBucket(row.categoryMinutes[bucket], members, ratios[bucket]);
    for (const m of members) out[m] = split[m] ?? 0;
  }
  return out;
}

async function main() {
  await mkdir(path.join(OUT_DIR, 'base-slices'), { recursive: true });
  await mkdir(path.join(OUT_DIR, 'adjustment-factors'), { recursive: true });
  await mkdir(path.join(OUT_DIR, 'trends'), { recursive: true });
  await mkdir(path.join(OUT_DIR, 'methodology'), { recursive: true });

  // ---- Load sources ----
  const atusBase = await tryReadJson<AtusBaseSliceRow[]>('sources/atus/base_slices.json', []);
  const atusCrossTabs = await tryReadJson<AtusCrossTabs>('sources/atus/tier1_crosstabs.json', {
    employment: [],
    education: [],
    income: [],
  });
  const atusLocationDefaults = await tryReadJson<Record<string, { location: string; basis: string; note: string }>>(
    'sources/atus/location_defaults.json',
    {}
  );
  const atusCitation = await tryReadJson<SourceCitation | null>('sources/atus/citation.json', null);

  const oecdRows = await tryReadJson<OecdRow[]>('sources/oecd/base_slices.json', []);
  const oecdCitation = await tryReadJson<SourceCitation | null>('sources/oecd/citation.json', null);

  const unSdgRows = await tryReadJson<UnSdgRow[]>('sources/un-sdg/unpaid_care_work.json', []);
  const unSdgCitation = await tryReadJson<SourceCitation | null>('sources/un-sdg/citation.json', null);

  const countryMetaRaw = await tryReadJson<
    { iso3: string; name: string; region: string; incomeGroup: WorldBankIncomeGroup; population: number; populationYear: number }[]
  >('countries/country_meta.json', []);
  const countryMetaCitation = await tryReadJson<SourceCitation | null>('countries/citation.json', null);

  if (atusBase.length === 0) {
    console.error('ATUS base_slices.json not found or empty — cannot build without the Tier-1 anchor. Aborting.');
    process.exit(1);
  }

  const citations: SourceCitation[] = [atusCitation, oecdCitation, unSdgCitation, countryMetaCitation].filter(
    (c): c is SourceCitation => c !== null
  );

  // ---- US Tier-1 base slices (already in our 14-category taxonomy) ----
  const usGrandMeanRow = atusBase.find((r) => r.ageGroup === 'all' && r.gender === 'all');
  if (!usGrandMeanRow) {
    console.error('ATUS data has no ageGroup=all/gender=all grand mean row — required to derive OECD bucket-split ratios. Aborting.');
    process.exit(1);
  }
  const usGrandMean = { ...emptyMinutes(), ...usGrandMeanRow.categoryMinutes } as Record<ActivityCategory, number>;
  const internalRatios = computeInternalRatios(usGrandMean);

  const usSlices: BaseSlice[] = atusBase.map((row) => ({
    country: 'USA',
    ageGroup: row.ageGroup as BaseSlice['ageGroup'],
    gender: row.gender as BaseSlice['gender'],
    tier: 1 as DataTier,
    categoryMinutes: { ...emptyMinutes(), ...row.categoryMinutes } as Record<ActivityCategory, number>,
    sourceIds: atusCitation ? [atusCitation.id] : [],
    dataYear: atusCitation?.year ?? null,
  }));

  // ---- Income-group archetypes from whatever Tier-1/2 real data we have ----
  const oecdByCountry = new Map<string, OecdRow[]>();
  for (const row of oecdRows) {
    const list = oecdByCountry.get(row.country) ?? [];
    list.push(row);
    oecdByCountry.set(row.country, list);
  }

  const countryMetaByIso = new Map(countryMetaRaw.map((c) => [c.iso3, c]));

  type ArchetypeAccumulator = { sum: Record<ActivityCategory, number>; n: number };
  function newAcc(): ArchetypeAccumulator {
    return { sum: emptyMinutes(), n: 0 };
  }
  function addToAcc(acc: ArchetypeAccumulator, minutes: Record<ActivityCategory, number>) {
    for (const c of CATEGORY_ORDER) acc.sum[c] += minutes[c] ?? 0;
    acc.n += 1;
  }
  function accToMeans(acc: ArchetypeAccumulator): Record<ActivityCategory, number> {
    if (acc.n === 0) return emptyMinutes();
    const out = emptyMinutes();
    for (const c of CATEGORY_ORDER) out[c] = acc.sum[c] / acc.n;
    return out;
  }

  const INCOME_GROUPS: WorldBankIncomeGroup[] = ['low', 'lower_middle', 'upper_middle', 'high'];
  const GENDERS: ('all' | 'male' | 'female')[] = ['all', 'male', 'female'];

  const archetypeAcc = new Map<string, ArchetypeAccumulator>(); // key: `${incomeGroup}:${gender}`
  const globalAcc = new Map<string, ArchetypeAccumulator>(); // key: gender, fallback pool

  function accKey(ig: string, gender: string) {
    return `${ig}:${gender}`;
  }
  for (const g of GENDERS) {
    globalAcc.set(g, newAcc());
    for (const ig of INCOME_GROUPS) archetypeAcc.set(accKey(ig, g), newAcc());
  }

  // Feed US (Tier 1) into the 'high' income archetype + global.
  const usMeta = countryMetaByIso.get('USA');
  const usIncomeGroup: WorldBankIncomeGroup = usMeta?.incomeGroup ?? 'high';
  addToAcc(archetypeAcc.get(accKey(usIncomeGroup, 'all'))!, usGrandMean);
  addToAcc(globalAcc.get('all')!, usGrandMean);
  const usMale = atusBase.find((r) => r.ageGroup === 'all' && r.gender === 'male');
  const usFemale = atusBase.find((r) => r.ageGroup === 'all' && r.gender === 'female');
  if (usMale) {
    const m = { ...emptyMinutes(), ...usMale.categoryMinutes } as Record<ActivityCategory, number>;
    addToAcc(archetypeAcc.get(accKey(usIncomeGroup, 'male'))!, m);
    addToAcc(globalAcc.get('male')!, m);
  }
  if (usFemale) {
    const f = { ...emptyMinutes(), ...usFemale.categoryMinutes } as Record<ActivityCategory, number>;
    addToAcc(archetypeAcc.get(accKey(usIncomeGroup, 'female'))!, f);
    addToAcc(globalAcc.get('female')!, f);
  }

  // Feed every OECD (Tier 2) country into its income-group archetype + global.
  const oecdCategoryMinutesCache = new Map<string, Record<ActivityCategory, number>>(); // `${country}:${gender}`
  for (const row of oecdRows) {
    const minutes = oecdRowToCategoryMinutes(row, internalRatios);
    oecdCategoryMinutesCache.set(`${row.country}:${row.gender}`, minutes);
    const meta = countryMetaByIso.get(row.country);
    const ig = meta?.incomeGroup ?? 'high';
    addToAcc(archetypeAcc.get(accKey(ig, row.gender))!, minutes);
    addToAcc(globalAcc.get(row.gender)!, minutes);
  }

  function archetypeFor(incomeGroup: WorldBankIncomeGroup, gender: 'all' | 'male' | 'female'): Record<ActivityCategory, number> {
    const acc = archetypeAcc.get(accKey(incomeGroup, gender))!;
    if (acc.n > 0) return accToMeans(acc);
    // fall back to the 'all' gender archetype for this income group
    if (gender !== 'all') {
      const allAcc = archetypeAcc.get(accKey(incomeGroup, 'all'))!;
      if (allAcc.n > 0) return accToMeans(allAcc);
    }
    // fall back to the global pool
    const g = globalAcc.get(gender)!;
    if (g.n > 0) return accToMeans(g);
    return accToMeans(globalAcc.get('all')!);
  }

  // ---- UN-SDG lookup: unpaid care work by country/sex/urbanRural ----
  const unSdgByCountrySexAll = new Map<string, UnSdgRow>(); // key: `${country}:${sex}` for urbanRural='all'
  for (const row of unSdgRows) {
    if (row.urbanRural === 'all') unSdgByCountrySexAll.set(`${row.country}:${row.sex}`, row);
  }

  // ---- Assemble a BaseSlice for every country x gender in ['all','male','female'] ----
  const countryTierMap = new Map<string, DataTier>();
  const countrySlices = new Map<string, BaseSlice[]>(); // key: iso3

  for (const meta of countryMetaRaw) {
    if (meta.iso3 === 'USA') {
      countryTierMap.set('USA', 1);
      countrySlices.set('USA', usSlices);
      continue;
    }

    const slices: BaseSlice[] = [];
    const hasOecd = oecdByCountry.has(meta.iso3);
    const hasUnSdg = unSdgByCountrySexAll.has(`${meta.iso3}:female`) || unSdgByCountrySexAll.has(`${meta.iso3}:male`);
    const tier: DataTier = hasOecd ? 2 : hasUnSdg ? 2 : 3;
    countryTierMap.set(meta.iso3, tier);

    for (const gender of GENDERS) {
      let minutes: Record<ActivityCategory, number>;
      const sourceIds: string[] = [];

      if (hasOecd) {
        const cached = oecdCategoryMinutesCache.get(`${meta.iso3}:${gender}`);
        minutes = cached ?? oecdCategoryMinutesCache.get(`${meta.iso3}:all`) ?? archetypeFor(meta.incomeGroup, gender);
        if (oecdCitation) sourceIds.push(oecdCitation.id);
        if (atusCitation) sourceIds.push(atusCitation.id);
      } else {
        // The income-group archetype pools data from both the Tier-1 (ATUS)
        // and Tier-2 (OECD) countries that fed it, so both must be cited
        // even though this specific country isn't itself an OECD row.
        minutes = { ...archetypeFor(meta.incomeGroup, gender) };
        if (atusCitation) sourceIds.push(atusCitation.id);
        if (oecdCitation) sourceIds.push(oecdCitation.id);

        if (hasUnSdg && gender !== 'all') {
          const sdgRow = unSdgByCountrySexAll.get(`${meta.iso3}:${gender}`);
          if (sdgRow) {
            const currentUnpaid = sumMinutes(minutes, ['household', 'caregiving']);
            const targetUnpaid = sdgRow.unpaidCareWorkMinutesPerDay;
            if (currentUnpaid > 0 && targetUnpaid > 0) {
              const scale = targetUnpaid / currentUnpaid;
              const delta = targetUnpaid - currentUnpaid;
              minutes.household *= scale;
              minutes.caregiving *= scale;
              // renormalize: redistribute the delta proportionally across all other categories
              const others = CATEGORY_ORDER.filter((c) => c !== 'household' && c !== 'caregiving');
              const othersTotal = sumMinutes(minutes, others);
              if (othersTotal > 0) {
                for (const c of others) minutes[c] -= delta * (minutes[c] / othersTotal);
              }
            }
            if (unSdgCitation) sourceIds.push(unSdgCitation.id);
          }
        }
      }

      slices.push({
        country: meta.iso3,
        ageGroup: 'all',
        gender,
        tier,
        categoryMinutes: minutes,
        sourceIds: [...new Set(sourceIds)],
        dataYear: hasOecd ? oecdByCountry.get(meta.iso3)![0]!.dataYear : atusCitation?.year ?? null,
      });
    }
    countrySlices.set(meta.iso3, slices);
  }

  // ---- Write per-country base-slice files ----
  for (const [iso3, slices] of countrySlices) {
    await writeFile(path.join(OUT_DIR, 'base-slices', `${iso3}.json`), JSON.stringify(slices));
  }

  // ---- World average: population-weighted blend of every country's 'all' gender slice ----
  const totalPop = countryMetaRaw.reduce((s, c) => s + (c.population ?? 0), 0);
  const worldMinutes = emptyMinutes();
  for (const meta of countryMetaRaw) {
    const slice = countrySlices.get(meta.iso3)?.find((s) => s.gender === 'all');
    if (!slice || totalPop === 0) continue;
    const weight = meta.population / totalPop;
    for (const c of CATEGORY_ORDER) worldMinutes[c] += slice.categoryMinutes[c] * weight;
  }
  const worldSlice: BaseSlice = {
    country: 'WLD',
    ageGroup: 'all',
    gender: 'all',
    tier: 2,
    categoryMinutes: worldMinutes,
    sourceIds: citations.map((c) => c.id),
    dataYear: null,
  };
  await writeFile(path.join(OUT_DIR, 'world-average.json'), JSON.stringify([worldSlice]));

  // ---- Adjustment factors: employment & education from ATUS Tier-1 cross-tabs ----
  function buildFactorsFromCrossTabs(dimension: AdjustmentDimension, rows: AtusCrossTabRow[]): AdjustmentFactor[] {
    const factors: AdjustmentFactor[] = [];
    for (const row of rows) {
      const rowMinutes = { ...emptyMinutes(), ...row.categoryMinutes } as Record<ActivityCategory, number>;
      for (const category of CATEGORY_ORDER) {
        const grand = usGrandMean[category];
        if (!grand || grand <= 0) continue;
        const ratio = rowMinutes[category] / grand;
        if (!Number.isFinite(ratio) || ratio <= 0) continue;
        factors.push({
          dimension,
          level: row.level,
          poolKey: 'global',
          category,
          form: 'ratio',
          value: ratio,
          standardError: 0.15, // single-source (US-only) estimate; wide SE reflects low cross-country agreement
          nCountries: 1,
        });
      }
    }
    return factors;
  }

  const employmentFactors = buildFactorsFromCrossTabs('employment', atusCrossTabs.employment ?? []);
  const educationFactors = buildFactorsFromCrossTabs('education', atusCrossTabs.education ?? []);
  const incomeFactors = buildFactorsFromCrossTabs('income', atusCrossTabs.income ?? []);

  // Urban/rural: derived from UN-SDG country pairs that report both urban and rural unpaid-care-work figures,
  // applied only to household & caregiving (the categories that indicator actually measures) — we do not
  // fabricate an urban/rural effect for categories with no real signal behind them.
  const urbanRuralByCountrySex = new Map<string, { urban?: number; rural?: number; all?: number }>();
  for (const row of unSdgRows) {
    const key = `${row.country}:${row.sex}`;
    const entry = urbanRuralByCountrySex.get(key) ?? {};
    entry[row.urbanRural] = row.unpaidCareWorkMinutesPerDay;
    urbanRuralByCountrySex.set(key, entry);
  }
  let urbanRatioSum = 0;
  let ruralRatioSum = 0;
  let urbanRuralN = 0;
  for (const entry of urbanRuralByCountrySex.values()) {
    if (entry.urban && entry.rural && entry.all && entry.all > 0) {
      urbanRatioSum += entry.urban / entry.all;
      ruralRatioSum += entry.rural / entry.all;
      urbanRuralN += 1;
    }
  }
  const urbanRuralFactors: AdjustmentFactor[] = [];
  if (urbanRuralN > 0) {
    const urbanRatio = urbanRatioSum / urbanRuralN;
    const ruralRatio = ruralRatioSum / urbanRuralN;
    for (const category of ['household', 'caregiving'] as ActivityCategory[]) {
      urbanRuralFactors.push(
        { dimension: 'urbanRural', level: 'urban', poolKey: 'global', category, form: 'ratio', value: urbanRatio, standardError: 0.2, nCountries: urbanRuralN },
        { dimension: 'urbanRural', level: 'rural', poolKey: 'global', category, form: 'ratio', value: ruralRatio, standardError: 0.2, nCountries: urbanRuralN }
      );
    }
  }

  await writeFile(path.join(OUT_DIR, 'adjustment-factors', 'employment.json'), JSON.stringify(employmentFactors));
  await writeFile(path.join(OUT_DIR, 'adjustment-factors', 'education.json'), JSON.stringify(educationFactors));
  await writeFile(path.join(OUT_DIR, 'adjustment-factors', 'income.json'), JSON.stringify(incomeFactors));
  await writeFile(path.join(OUT_DIR, 'adjustment-factors', 'urbanRural.json'), JSON.stringify(urbanRuralFactors));

  // ---- Location defaults ----
  const validLocations: LocationContext[] = ['home', 'workplace', 'school', 'someone_elses_home', 'transit', 'other_public', 'unknown'];
  const locationDefaults: Record<string, LocationContext> = {};
  for (const category of CATEGORY_ORDER) {
    const loc = atusLocationDefaults[category]?.location;
    locationDefaults[category] = validLocations.includes(loc as LocationContext) ? (loc as LocationContext) : 'unknown';
  }
  await writeFile(path.join(OUT_DIR, 'location-defaults.json'), JSON.stringify(locationDefaults));

  // ---- Trends (measured wave-years only; empty for now unless a trends source file exists) ----
  const trendsRaw = await tryReadJson<Record<string, CountryTrend>>('sources/atus/trends.json', {});
  for (const [iso3, trend] of Object.entries(trendsRaw)) {
    await writeFile(path.join(OUT_DIR, 'trends', `${iso3}.json`), JSON.stringify(trend));
  }

  // ---- Manifest ----
  const countries: CountryMeta[] = countryMetaRaw.map((meta) => ({
    iso3: meta.iso3,
    name: meta.name,
    region: meta.region,
    incomeGroup: meta.incomeGroup,
    tier: countryTierMap.get(meta.iso3) ?? 3,
    dataYear: countrySlices.get(meta.iso3)?.[0]?.dataYear ?? null,
    sourceIds: [...new Set(countrySlices.get(meta.iso3)?.flatMap((s) => s.sourceIds) ?? [])],
    population: meta.population,
  }));

  const manifest: DataManifest = {
    version: '1',
    generatedAt: new Date().toISOString(),
    countries,
    categories: CATEGORY_ORDER,
    citations,
  };
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest));

  const tierCounts = countries.reduce(
    (acc, c) => ({ ...acc, [c.tier]: (acc[c.tier] ?? 0) + 1 }),
    {} as Record<number, number>
  );
  console.log(`Built data for ${countries.length} countries. Tier breakdown:`, tierCounts);
  console.log(`Employment factors: ${employmentFactors.length}, Education: ${educationFactors.length}, Income: ${incomeFactors.length}, UrbanRural: ${urbanRuralFactors.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
