# OECD Time Use Database — raw sources

Fetched 2026-07-02.

- `OECD-time-use-database-updates.xlsx` — primary source. Official OECD workbook
  downloaded directly from
  https://www.oecd.org/content/dam/oecd/en/data/datasets/time-use-database/OECD-time-use-database-updates.xlsx
  (linked from https://www.oecd.org/en/data/datasets/time-use-database.html).
  Contains sheets `Total`, `Men`, `Women` with average minutes/day spent in
  activities, by country, plus each country's own latest survey year (row 2)
  and a detailed activity-category breakdown. Row indices 4, 11, 21, 25, 31 are
  the five top-level categories (Paid work or study, Unpaid work, Personal
  care, Leisure, Other); row 34 is the Total (sums to 1440 min = 24h).
  Compilation dated 2026 per the "Read me" sheet (last update note: 30 April 2026).

- `sdmx_time_use_latest.csv` — cross-validation source. SDMX-CSV export from the
  OECD Data Explorer / SDMX API:
  `https://sdmx.oecd.org/public/rest/data/OECD.WISE.INE,DSD_TIME_USE@DF_TIME_USE,/all?format=csv`
  Contains REF_AREA (ISO3), MEASURE (LEI/OTH/PAW/PCA/UPW), SEX (F/M/_T), and
  OBS_VALUE in minutes/day for the latest available year per country (no
  explicit year column in this particular endpoint response). Used to
  spot-check the xlsx-derived numbers (e.g. AUS all-persons values matched
  exactly between both sources).

- `sdmx_dataflow_structure.json` — SDMX dataflow/DSD structure metadata for
  `OECD.WISE.INE:DSD_TIME_USE@DF_TIME_USE` (codelists, dimensions) fetched from
  `https://sdmx.oecd.org/public/rest/dataflow/OECD.WISE.INE/DSD_TIME_USE@DF_TIME_USE/all?references=all`.

- `extracted_raw.json` — intermediate transcription: for each of the three
  xlsx sheets (Total/Men/Women), for each of the 35 countries in the workbook,
  the raw survey year string and the five top-level category values (minutes),
  plus the Total-row value (should be ~1440) used as a QA check. This is the
  direct input to `../base_slices.json` (via ISO3 country-name mapping and
  gender relabeling: Total->all, Men->male, Women->female).

## Coverage

35 countries, each with Total/Men/Women rows, all summing to 1440 minutes/day:
AUS, AUT, BEL, BGR, CAN, CHN, HRV, DNK, EST, FIN, FRA, DEU, GRC, HUN, IND, IRL,
ITA, JPN, KOR, LVA, LTU, LUX, MEX, NLD, NZL, NOR, POL, PRT, SVN, ZAF, ESP, SWE,
TUR, GBR, USA.

Survey years vary by country (each country's own latest available survey),
ranging from 1998/99 (India) to 2024 (Mexico, United States). See
`base_slices.json` `dataYear` field per record (first year taken for
multi-year survey windows like "2021/22").
