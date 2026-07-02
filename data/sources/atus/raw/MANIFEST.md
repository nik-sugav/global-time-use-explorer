# ATUS raw source archive

Fetched 2026-07-02 via curl / WebFetch from bls.gov (public domain, U.S. government work).
All figures used in the parent directory's JSON outputs were transcribed exactly from these
files (or the equivalent Read-tool PDF extraction of `a1-2025.pdf`) — no numbers were fabricated.

## Files actually used to build the output JSON

- `a1-2025.pdf` — Table A-1, "Time spent in detailed primary activities and percent of the
  civilian population engaging in each activity, averages per day by sex, 2025 annual averages."
  https://www.bls.gov/tus/tables/a1-2025.pdf
  Source of: grand-mean and by-gender `base_slices.json` rows (full detail incl. all
  "travel related to X" sub-lines, which is what let us isolate `commute` as its own category).

- `atus_t03.html` / `atus_t03_clean.txt` — News release Table 3, "Time spent in primary
  activities for the civilian population by age, sex, race, Hispanic or Latino ethnicity,
  marital status, and educational attainment, 2025 annual averages."
  https://www.bls.gov/news.release/atus.t03.htm
  Source of: by-age-group `base_slices.json` rows and the `education` array in
  `tier1_crosstabs.json`.

- `atus_t11A.html` / `atus_t11A_clean.txt` — News release Table 11A, "Time spent in leisure
  and sports activities for the civilian population by selected characteristics, averages
  per day, 2025 annual averages."
  https://www.bls.gov/news.release/atus.t11A.htm
  Source of: the age-band Watching-TV / Sports-exercise-recreation figures used to split
  Table 3's lumped "Leisure and sports" column into screen_leisure / exercise / socializing
  for the age-group rows. Also contains an "Employment status" (Employed/Not employed) and a
  weekly-earnings-quartile section, but ONLY for the leisure-and-sports sub-categories — not
  the full activity list — so these were judged insufficient to build a full `employment` or
  `income` marginal row without fabricating the other categories (see caveats in the parent
  README / tool output).

- `atus_t06.html` / `atus_t06_clean.txt` — News release Table 6, "Employed people working at
  home, workplace, and time spent working at each location by full- and part-time status and
  sex, jobholding status, and educational attainment, 2025 annual averages."
  https://www.bls.gov/news.release/atus.t06.htm
  Source of the `paid_work` → `workplace` location default in `location_defaults.json`
  (69.8% of employed people who worked did so at their workplace vs. 34.5% who did some work
  at home, per Table 6's "Total, 15 years and over" row).

- `atus_nr0_current.html` — The full ATUS 2025 news release narrative
  (https://www.bls.gov/news.release/atus.nr0.htm), used to confirm reference year, release
  date (June 25, 2026, USDL-26-1022), and to read the headline statistics quoted in the
  release text.

- `activity_by_age.html` / `activity_by_age_clean.txt` — BLS chart page "Average hours per
  day spent in selected activities by age" (https://www.bls.gov/charts/american-time-use/activity-by-age.htm).
  Cross-checked against Table 3's age breakdown — confirmed identical figures (both ultimately
  come from the same 2025 ATUS estimates), used only as a corroborating source, not a primary
  transcription source.

## Files fetched but NOT used in the final output (kept for provenance / were checked and ruled out)

- `atus_t01.html` / `atus_t01_clean.txt` — Table 1 (by-sex summary; superseded by the more
  granular Table A-1 PDF for the actual by-sex figures used).
- `atus_t02.html` — Table 2 (weekday/weekend breakdown; not used, our schema doesn't need it).
- `atus_t04.html` / `atus_t04_clean.txt` — Table 4 (work hours on days worked; checked for an
  employment-status crosstab, found only work-hours detail, not the full activity list).
- `atus_t05.html` — Table 5 (work by occupation/earnings; not used).
- `atus_t07.html` — Table 7 (work-at-home by occupation/earnings; not used).
- `atus_t08A.html`, `atus_t08B.html` / `atus_t08B_clean.txt`, `atus_t08C.html` — Tables 8A/8B/8C
  (activities by presence/age of household children, split employed/not-employed; checked as a
  possible source for the `employment` crosstab but ruled out because they are conditional on
  having children, not a clean marginal breakdown for the general population).
- `atus_t09.html`, `atus_t10.html` — Tables 9/10 (childcare time; not used, out of scope for
  our 14 categories).
- `atus_t11B.html` — Table 11B (leisure by weekday/weekend; not used).
- `atus_t12.html` — Table 12 (quarterly averages; not used, we only need annual averages).
- `tus_tables.html` — The ATUS tables index page (https://www.bls.gov/tus/tables.htm), used to
  discover which tables exist and find the `a1-2025.pdf` link.
- `tus_database.html` — The ATUS interactive database tool landing page
  (https://www.bls.gov/tus/database.htm); checked for a possible income/labor-force-status
  custom tabulation but the tool requires interactive form-based series selection, which was
  judged out of scope for "carefully transcribe from tables" (risk of misconfiguring a query
  and fabricating a series). No data was pulled from this tool.

## Known gaps (see also caveats returned by the build)

- No BLS-published table gives sleep hours separately by age or education for 2025 — only
  lumped into "Personal care activities." We estimated the split using the national
  sleep-share-of-personal-care ratio from Table A-1 (documented in each affected row's
  `sampleNote`).
- No BLS-published table isolates "travel related to X" by age band the way Table A-1 does by
  sex — so `commute` is 0 (embedded in its parent category) for all age-group and education
  rows, and only non-zero for the grand-mean/male/female rows.
- No marginal employment-status (employed/unemployed/not_in_labor_force/retired/student) table
  exists with the full activity-category breakdown for the general population in the standard
  2025 news release tables — `tier1_crosstabs.json`'s `employment` array is empty.
- No family/household-income-stratified table exists with the full activity-category breakdown
  — `tier1_crosstabs.json`'s `income` array is empty. The only income-related breakdown found
  (Table 11A, usual weekly earnings quartiles of full-time workers) covers only the
  leisure-and-sports sub-categories, not the full 14-category set.
- No TEWHERE/location-of-activity table was found in the 2025 news release tables; only Table 6's
  work-at-home-vs-workplace split is real survey-derived location evidence. All other
  `location_defaults.json` entries are reasonable defaults, clearly labeled as such.
