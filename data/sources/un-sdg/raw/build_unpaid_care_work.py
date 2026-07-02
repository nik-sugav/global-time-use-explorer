import json, re, sys
sys.path.insert(0, '/private/tmp/claude-501/-Users-nirmalkumarsugavanam-Life-Webapp/fa1f7cc2-9eb7-4c34-b774-323b44a896f9/scratchpad')
from m49_to_iso3 import M49_TO_ISO3

RAW = '/Users/nirmalkumarsugavanam/Life_Webapp/data/sources/un-sdg/raw/sl_dom_tspd_full.json'
OUT = '/Users/nirmalkumarsugavanam/Life_Webapp/data/sources/un-sdg/unpaid_care_work.json'

with open(RAW) as f:
    d = json.load(f)
data = d['data']

def age_breadth(age_code):
    """Lower tuple = broader/better age band for a national headline figure."""
    if age_code == 'ALLAGE':
        return (0, 0)
    m = re.match(r'^(\d+)\+$', age_code)
    if m:
        start = int(m.group(1))
        return (1, start)
    m = re.match(r'^(\d+)-(\d+)$', age_code)
    if m:
        start, end = int(m.group(1)), int(m.group(2))
        span = end - start
        return (2, -span, start)
    return (3, 0)

# Group records by (geoAreaCode, sex)
from collections import defaultdict
by_country_sex = defaultdict(list)
for r in data:
    iso3 = M49_TO_ISO3.get(r['geoAreaCode'])
    if iso3 is None:
        continue  # skip regional aggregates
    sex = r['dimensions']['Sex']
    if sex not in ('MALE', 'FEMALE'):
        continue
    by_country_sex[(iso3, sex)].append(r)

def sex_label(s):
    return {'MALE': 'male', 'FEMALE': 'female', 'BOTHSEX': 'all'}[s]

def loc_label(l):
    return {'ALLAREA': 'all', 'URBAN': 'urban', 'RURAL': 'rural'}[l]

results = []
provenance = []  # for citation/debug

def make_entry(iso3, sex, rec, urban_rural):
    pct = float(rec['value'])
    minutes = round(pct / 100.0 * 24 * 60, 1)
    age_group = 'all' if rec['dimensions']['Age'] == 'ALLAGE' else rec['dimensions']['Age']
    return {
        'country': iso3,
        'sex': sex_label(sex),
        'urbanRural': urban_rural,
        'unpaidCareWorkMinutesPerDay': minutes,
        'dataYear': int(rec['timePeriodStart']),
        'ageGroup': age_group,
    }

for (iso3, sex), records in by_country_sex.items():
    # Prefer a "headline" ALLAREA record: broadest age band, then most recent year.
    allarea_records = [r for r in records if r['dimensions']['Location'] == 'ALLAREA']

    if allarea_records:
        def sort_key(r):
            age = r['dimensions']['Age']
            breadth = age_breadth(age)
            year = r['timePeriodStart']
            return (breadth, -year)  # broadest first, then most recent
        allarea_records.sort(key=sort_key)
        best = allarea_records[0]
        best_age = best['dimensions']['Age']
        best_year = best['timePeriodStart']

        results.append(make_entry(iso3, sex, best, 'all'))
        provenance.append({
            'country': iso3, 'geoAreaName': best['geoAreaName'], 'sex': sex_label(sex),
            'urbanRural': 'all', 'age': best_age, 'year': best_year,
            'value_pct': best['value'], 'source': best.get('source'), 'nature': best['attributes']['Nature']
        })

        # Look for URBAN/RURAL records at the SAME age band and SAME year as the chosen headline record
        for loc in ('URBAN', 'RURAL'):
            matches = [r for r in records if r['dimensions']['Location'] == loc
                       and r['dimensions']['Age'] == best_age
                       and r['timePeriodStart'] == best_year]
            if matches:
                m = matches[0]
                results.append(make_entry(iso3, sex, m, loc_label(loc)))
                provenance.append({
                    'country': iso3, 'geoAreaName': m['geoAreaName'], 'sex': sex_label(sex),
                    'urbanRural': loc_label(loc), 'age': best_age, 'year': best_year,
                    'value_pct': m['value'], 'source': m.get('source'), 'nature': m['attributes']['Nature']
                })
    else:
        # No national (ALLAREA) figure exists for this country/sex - only urban/rural splits.
        # Emit the URBAN and RURAL records directly (no fabricated national average),
        # choosing the broadest age band + most recent year independently per location,
        # but keeping the same age/year across both when possible for comparability.
        for loc in ('URBAN', 'RURAL'):
            loc_records = [r for r in records if r['dimensions']['Location'] == loc]
            if not loc_records:
                continue
            def sort_key(r):
                age = r['dimensions']['Age']
                breadth = age_breadth(age)
                year = r['timePeriodStart']
                return (breadth, -year)
            loc_records.sort(key=sort_key)
            best = loc_records[0]
            results.append(make_entry(iso3, sex, best, loc_label(loc)))
            provenance.append({
                'country': iso3, 'geoAreaName': best['geoAreaName'], 'sex': sex_label(sex),
                'urbanRural': loc_label(loc), 'age': best['dimensions']['Age'], 'year': best['timePeriodStart'],
                'value_pct': best['value'], 'source': best.get('source'), 'nature': best['attributes']['Nature'],
                'note': 'no national ALLAREA figure available; urban/rural only'
            })

# Sort results for readability: country, sex, urbanRural
urg_order = {'all': 0, 'urban': 1, 'rural': 2}
sex_order = {'female': 0, 'male': 1, 'all': 2}
results.sort(key=lambda r: (r['country'], sex_order[r['sex']], urg_order[r['urbanRural']]))

with open(OUT, 'w') as f:
    json.dump(results, f, indent=2)

with open('/Users/nirmalkumarsugavanam/Life_Webapp/data/sources/un-sdg/raw/extraction_provenance.json', 'w') as f:
    json.dump(provenance, f, indent=2)

print("Total entries:", len(results))
print("Unique countries:", len(set(r['country'] for r in results)))
