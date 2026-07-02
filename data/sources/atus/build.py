import json
import os

OUT_DIR = "/Users/nirmalkumarsugavanam/Life_Webapp/data/sources/atus"

# ============================================================
# Source data transcribed EXACTLY from BLS ATUS Table A-1 (2025 annual averages)
# https://www.bls.gov/tus/tables/a1-2025.pdf
# Units: hours per day (as published), tuple = (Total, Men, Women)
# ============================================================

A1 = {
    "personal_care_activities_total": (9.80, 9.59, 10.00),
    "sleeping": (9.03, 8.93, 9.13),
    "grooming": (0.67, 0.58, 0.77),
    "health_related_self_care": (0.08, 0.06, 0.09),
    "personal_activities": (0.00, 0.00, 0.00),  # "approximately zero" footnote 2
    "travel_personal_care": (0.01, 0.01, 0.01),
    "eating_and_drinking_total": (1.21, 1.24, 1.18),
    "eating_and_drinking": (1.11, 1.14, 1.08),
    "travel_eating_drinking": (0.10, 0.10, 0.10),
    "household_activities_total": (1.99, 1.58, 2.38),
    "travel_household": (0.04, 0.04, 0.05),
    "purchasing_goods_services_total": (0.69, 0.61, 0.77),
    "consumer_goods_purchases": (0.30, 0.26, 0.35),
    "professional_personal_care_services": (0.10, 0.09, 0.12),  # incl financial/medical/personal care svcs/household svcs/govt svcs
    "household_services": (0.02, 0.02, 0.02),
    "government_services": (0.00, 0.00, 0.00),
    "travel_purchasing": (0.26, 0.24, 0.28),
    "caring_household_members_total": (0.49, 0.36, 0.61),
    "travel_caring_household": (0.08, 0.07, 0.09),
    "caring_nonhousehold_members_total": (0.15, 0.14, 0.16),
    "travel_caring_nonhousehold": (0.04, 0.04, 0.04),
    "working_workrelated_total": (3.32, 3.82, 2.84),
    "travel_work": (0.22, 0.29, 0.16),
    "educational_activities_total": (0.44, 0.41, 0.47),
    "travel_education": (0.02, 0.02, 0.02),
    "org_civic_religious_total": (0.28, 0.25, 0.31),
    "religious_spiritual": (0.13, 0.11, 0.15),
    "volunteering": (0.12, 0.11, 0.12),
    "travel_org_civic_religious": (0.03, 0.03, 0.04),
    "leisure_sports_total": (5.16, 5.58, 4.76),
    "socializing_relaxing_leisure_total": (4.60, 4.92, 4.30),
    "socializing_communicating": (0.58, 0.52, 0.65),
    "relaxing_and_leisure_total": (3.95, 4.36, 3.57),  # published subtotal; sub-lines below don't sum exactly to it (source rounding)
    "watching_tv": (2.61, 2.81, 2.42),
    "relaxing_thinking": (0.35, 0.39, 0.30),
    "playing_games": (0.40, 0.55, 0.25),
    "computer_use_leisure": (0.22, 0.24, 0.20),
    "reading_personal_interest": (0.27, 0.23, 0.31),
    "arts_entertainment": (0.06, 0.05, 0.08),
    "sports_exercise_recreation_total": (0.37, 0.46, 0.29),  # = participating + attending events (travel is a separate sibling line)
    "participating_sports_exercise": (0.34, 0.43, 0.26),
    "walking": (0.09, 0.08, 0.10),
    "attending_sporting_events": (0.03, 0.04, 0.02),
    "travel_leisure_sports": (0.19, 0.20, 0.18),
    "telephone_calls_mail_email_total": (0.19, 0.13, 0.25),
    "travel_telephone": (0.00, 0.00, 0.00),
    "other_nec_total": (0.27, 0.28, 0.27),
}

def h2m(h):
    return round(h * 60, 2)

def build_row(idx):
    """idx: 0=Total, 1=Men, 2=Women -- returns categoryMinutes dict using our 14 categories,
    with commute isolated from all 'travel related to X' sublines (Table A-1 only)."""
    g = lambda k: A1[k][idx]

    sleep = g("sleeping")

    personal_care = (
        g("grooming") + g("health_related_self_care") + g("personal_activities")
        + g("professional_personal_care_services")  # ATUS 08: professional/personal care services received
    )

    eating = g("eating_and_drinking")  # travel excluded -> goes to commute

    paid_work = g("working_workrelated_total") - g("travel_work")  # 05/35 minus its travel line

    education = g("educational_activities_total") - g("travel_education")

    household = (
        g("household_activities_total") - g("travel_household")
        + g("household_services")  # ATUS 09
    )

    caregiving = (
        (g("caring_household_members_total") - g("travel_caring_household"))
        + (g("caring_nonhousehold_members_total") - g("travel_caring_nonhousehold"))
    )

    shopping = (
        g("consumer_goods_purchases")  # ATUS 07 consumer goods purchases (professional/personal care services -> personal_care; household/govt services -> household)
    )

    screen_leisure = g("watching_tv")  # ATUS 1203

    socializing = (
        g("socializing_communicating")
        + (g("relaxing_and_leisure_total") - g("watching_tv"))  # published subtotal minus TV, so unlisted minor sub-activities aren't lost
        + g("arts_entertainment")
        + (g("telephone_calls_mail_email_total") - g("travel_telephone"))  # ATUS 16
    )

    exercise = g("sports_exercise_recreation_total")  # ATUS 13, travel excluded -> commute

    civic_religious = (
        g("government_services")  # ATUS 10
        + g("religious_spiritual")  # ATUS 14
        + g("volunteering")  # ATUS 15
    )

    other = g("other_nec_total")  # ATUS 50

    commute = (
        g("travel_personal_care") + g("travel_eating_drinking") + g("travel_household")
        + g("travel_purchasing") + g("travel_caring_household") + g("travel_caring_nonhousehold")
        + g("travel_work") + g("travel_education") + g("travel_org_civic_religious")
        + g("travel_leisure_sports") + g("travel_telephone")
    )

    cats = {
        "sleep": sleep,
        "personal_care": personal_care,
        "eating": eating,
        "paid_work": paid_work,
        "education": education,
        "household": household,
        "caregiving": caregiving,
        "shopping": shopping,
        "commute": commute,
        "screen_leisure": screen_leisure,
        "socializing": socializing,
        "exercise": exercise,
        "civic_religious": civic_religious,
        "other": other,
    }
    return {k: h2m(v) for k, v in cats.items()}


# ============================================================
# Source data transcribed EXACTLY from BLS ATUS Table 3 (2025 annual averages)
# https://www.bls.gov/news.release/atus.t03.htm
# Columns (in order): Personal care, Eating&drinking, Household, Purchasing,
#   Caring-HH, Caring-nonHH, Working, Educational, Org/civic/religious,
#   Leisure&sports, Telephone/mail/email, Other NEC
# NOTE: Table 3 embeds travel time WITHIN each parent category (per Table 3/A-1
# methodology) and does NOT provide the travel-by-category breakdown that Table
# A-1 does. Therefore commute cannot be isolated for these rows; commute is left
# at 0 and travel time remains embedded in its parent activity category. This is
# called out in caveats.
# Also: Table 3 does not split "Leisure and sports" into TV vs other, so
# screen_leisure vs socializing cannot be split from Table 3 alone; we borrow the
# TV share-of-leisure ratio observed in Table 11A (age-specific!) which DOES
# publish watching-TV hours per age band, so this split is still real transcribed
# data, just from a second table.
# ============================================================

T3_AGE = {
    # age_label: (personal_care, eating, household, purchasing, caring_hh, caring_nonhh,
    #              working, education, org_civic_rel, leisure_sports, telephone, other_nec)
    "15-19": (10.93, 1.18, 0.71, 0.38, 0.07, 0.06, 0.71, 3.45, 0.51, 5.66, 0.18, 0.16),
    "20-24": (10.44, 1.13, 1.37, 0.62, 0.41, 0.07, 3.85, 0.88, 0.19, 4.67, 0.17, 0.21),
    "25-34": (9.82, 1.13, 1.58, 0.59, 0.79, 0.04, 4.58, 0.42, 0.13, 4.50, 0.11, 0.29),
    "35-44": (9.40, 1.16, 1.98, 0.72, 1.23, 0.09, 4.83, 0.09, 0.17, 3.89, 0.12, 0.32),
    "45-54": (9.49, 1.22, 2.18, 0.66, 0.51, 0.27, 4.70, 0.03, 0.25, 4.30, 0.17, 0.23),
    "55-64": (9.67, 1.19, 2.18, 0.75, 0.16, 0.24, 3.83, 0.04, 0.28, 5.21, 0.19, 0.26),
    "65-74": (9.63, 1.27, 2.74, 0.88, 0.13, 0.25, 1.14, 0.03, 0.46, 6.90, 0.31, 0.28),
    "75+": (9.87, 1.49, 2.73, 0.82, 0.09, 0.14, 0.26, 0.00, 0.42, 7.39, 0.41, 0.37),
}

T3_EDUCATION = {
    # 25 years and over only
    "below_secondary": (10.04, 1.11, 2.36, 0.69, 0.45, 0.18, 2.97, 0.00, 0.25, 5.55, 0.10, 0.28),  # Less than a high school diploma
    "secondary": (9.89, 1.15, 2.27, 0.66, 0.41, 0.18, 3.06, 0.05, 0.21, 5.68, 0.20, 0.25),  # High school graduates, no college
    # tertiary approximated as weighted concept: we report "Bachelor's degree and higher" as tertiary;
    # "Some college or associate degree" is a distinct partial-tertiary bucket we surface separately in sampleNote only.
    "tertiary": (9.42, 1.33, 2.06, 0.74, 0.64, 0.13, 4.05, 0.18, 0.31, 4.60, 0.22, 0.32),  # Bachelor's degree and higher
}
T3_SOME_COLLEGE = (9.60, 1.15, 2.21, 0.79, 0.53, 0.22, 3.21, 0.09, 0.26, 5.47, 0.19, 0.28)  # for reference/caveat only

# Table 11A: leisure & sports sub-split by age (Total column) -- gives us Watching TV hours
# per age band, letting us split Table 3's lumped "Leisure and sports" into screen_leisure vs socializing.
# https://www.bls.gov/news.release/atus.t11A.htm
# (leisure_total, participating_sports_exercise, socializing_communicating, watching_tv, reading, relaxing_thinking, playing_games_computer, other_incl_travel)
T11A_AGE = {
    "15-19": (5.66, 0.75, 0.64, 1.48, 0.00, 0.41, 1.53, 0.64),
    "20-24": (4.67, 0.40, 0.51, 2.07, 0.10, 0.20, 1.08, 0.32),
    "25-34": (4.50, 0.33, 0.59, 1.89, 0.17, 0.25, 0.91, 0.36),
    "35-44": (3.89, 0.30, 0.58, 1.76, 0.22, 0.25, 0.44, 0.34),
    "45-54": (4.30, 0.30, 0.56, 2.26, 0.21, 0.28, 0.39, 0.31),
    "55-64": (5.21, 0.25, 0.66, 3.06, 0.21, 0.37, 0.26, 0.38),
    "65-74": (6.90, 0.34, 0.55, 4.20, 0.46, 0.49, 0.43, 0.43),
    "75+": (7.39, 0.27, 0.56, 4.43, 0.62, 0.65, 0.48, 0.37),
}


# National ratio of Sleeping within Personal care activities, from Table A-1 Total column
# (9.03 / 9.80). Used ONLY to split Table 3's lumped "Personal care activities" (which
# includes sleep) into sleep vs personal_care for age/education rows, since no BLS table
# publishes sleep hours separately by age or education for 2025. Documented estimate,
# not a directly transcribed age-specific figure -- see caveats.
NATIONAL_SLEEP_SHARE_OF_PERSONAL_CARE = A1["sleeping"][0] / A1["personal_care_activities_total"][0]


def build_row_from_t3(vals, t11a_vals=None):
    """vals: 12-tuple in Table 3 column order (hours/day).
    Since Table 3 embeds travel within each parent category, commute is left at 0
    and travel stays embedded in its parent category (documented caveat).
    t11a_vals: optional 8-tuple from T11A_AGE for the SAME age band:
      (leisure_total, participating_sports_exercise, socializing_communicating,
       watching_tv, reading, relaxing_thinking, playing_games_computer, other_incl_travel)
      When provided, used to split Table 3's lumped "Leisure and sports" into
      screen_leisure (TV, real transcribed figure), exercise (sports/exercise/rec,
      real transcribed figure), and socializing (remainder, by subtraction so no
      minutes are lost). When not provided, the whole leisure+telephone lump goes to
      socializing per task fallback instructions.
    """
    (personal_care_incl_sleep, eating, household, purchasing, caring_hh, caring_nonhh,
     working, education, org_civic_rel, leisure_sports, telephone, other_nec) = vals

    sleep = personal_care_incl_sleep * NATIONAL_SLEEP_SHARE_OF_PERSONAL_CARE
    personal_care = personal_care_incl_sleep - sleep

    if t11a_vals is not None:
        leisure_total, sports_exercise, socializing_comm, tv, reading, relax_think, games_computer, other_leisure = t11a_vals
        screen_leisure = tv
        exercise = sports_exercise
        # Remainder of the age-band's actual leisure_sports figure (from Table 3, the
        # authoritative per-age total) after removing TV and sports/exercise, plus telephone.
        socializing = max(0.0, leisure_sports - tv - sports_exercise) + telephone
    else:
        screen_leisure = 0.0
        exercise = 0.0
        socializing = leisure_sports + telephone

    cats_hours = {
        "sleep": sleep,
        "personal_care": personal_care,
        "eating": eating,
        "paid_work": working,
        "education": education,
        "household": household,
        "caregiving": caring_hh + caring_nonhh,
        "shopping": purchasing,
        "commute": 0.0,  # embedded in parent categories for Table 3 rows -- see caveat
        "screen_leisure": screen_leisure,
        "socializing": socializing,
        "exercise": exercise,
        "civic_religious": org_civic_rel,
        "other": other_nec,
    }
    return {k: h2m(v) for k, v in cats_hours.items()}


def merge_avg(*rows):
    """Simple unweighted average of two or more categoryMinutes dicts (same keys).
    Used only to merge adjacent ATUS age bins into our coarser bins, since no
    population-count weights were available in the fetched tables to do a proper
    weighted merge. Documented as an approximation in caveats."""
    keys = rows[0].keys()
    return {k: round(sum(r[k] for r in rows) / len(rows), 2) for k in keys}


CATS = ["sleep", "personal_care", "eating", "paid_work", "education", "household",
        "caregiving", "shopping", "commute", "screen_leisure", "socializing",
        "exercise", "civic_religious", "other"]


def main():
    # ---------- base_slices.json ----------
    base_slices = []

    row_all = build_row(0)
    base_slices.append({
        "ageGroup": "all",
        "gender": "all",
        "categoryMinutes": row_all,
        "sampleNote": "U.S. civilian noninstitutional population 15+, 2025 annual averages. Source: BLS ATUS Table A-1 (Total column). Commute isolated from all 'travel related to X' sub-lines; screen_leisure = Watching TV; socializing includes relaxing/reading/games/computer-use/arts/telephone calls minus their travel line.",
    })

    row_men = build_row(1)
    base_slices.append({
        "ageGroup": "all",
        "gender": "male",
        "categoryMinutes": row_men,
        "sampleNote": "U.S. men 15+, 2025 annual averages. Source: BLS ATUS Table A-1 (Men column).",
    })

    row_women = build_row(2)
    base_slices.append({
        "ageGroup": "all",
        "gender": "female",
        "categoryMinutes": row_women,
        "sampleNote": "U.S. women 15+, 2025 annual averages. Source: BLS ATUS Table A-1 (Women column).",
    })

    # Age-group rows (gender='all'), from Table 3 + Table 11A (for TV/exercise split)
    age_rows = {}
    for age_label, vals in T3_AGE.items():
        t11a = T11A_AGE.get(age_label)
        age_rows[age_label] = build_row_from_t3(vals, t11a)

    age_note = ("U.S. population, 2025 annual averages. Source: BLS ATUS Table 3 (age columns) for the 12 "
                "published category totals; Table 11A (age columns) used to split 'Leisure and sports' into "
                "screen_leisure (Watching TV) vs exercise (Sports, exercise, and recreation) vs socializing "
                "(remainder). NOTE: Table 3 embeds travel time inside each parent activity category rather than "
                "isolating it, so commute could not be separated for this row and is reported as 0 minutes here "
                "(travel time is folded into paid_work, household, shopping, etc. -- unlike the grand-mean/gender "
                "rows, which DO isolate commute using Table A-1). NOTE: sleep was estimated by applying the "
                "national sleep-share-of-personal-care ratio from Table A-1 (9.03/9.80 = 92.14%) to this age "
                "band's 'Personal care activities' total, because BLS does not publish sleep hours separately by "
                "age for 2025; this is a documented estimate, not a directly transcribed age-specific figure.")

    # our 15-24 = simple average of ATUS 15-19 and 20-24 (no population weights available in fetched tables)
    r_15_24 = merge_avg(age_rows["15-19"], age_rows["20-24"])
    base_slices.append({
        "ageGroup": "15-24", "gender": "all", "categoryMinutes": r_15_24,
        "sampleNote": age_note + " Our '15-24' bin is an unweighted average of ATUS's published '15 to 19 years' and '20 to 24 years' bins (no population-count weights were available from the fetched tables to do a proper weighted merge).",
    })
    base_slices.append({
        "ageGroup": "25-34", "gender": "all", "categoryMinutes": age_rows["25-34"],
        "sampleNote": age_note + " Direct match to ATUS's published '25 to 34 years' bin.",
    })
    base_slices.append({
        "ageGroup": "35-44", "gender": "all", "categoryMinutes": age_rows["35-44"],
        "sampleNote": age_note + " Direct match to ATUS's published '35 to 44 years' bin.",
    })
    base_slices.append({
        "ageGroup": "45-54", "gender": "all", "categoryMinutes": age_rows["45-54"],
        "sampleNote": age_note + " Direct match to ATUS's published '45 to 54 years' bin.",
    })
    base_slices.append({
        "ageGroup": "55-64", "gender": "all", "categoryMinutes": age_rows["55-64"],
        "sampleNote": age_note + " Direct match to ATUS's published '55 to 64 years' bin.",
    })
    r_65_plus = merge_avg(age_rows["65-74"], age_rows["75+"])
    base_slices.append({
        "ageGroup": "65+", "gender": "all", "categoryMinutes": r_65_plus,
        "sampleNote": age_note + " Our '65+' bin is an unweighted average of ATUS's published '65 to 74 years' and '75 years and over' bins (no population-count weights were available from the fetched tables to do a proper weighted merge).",
    })

    # sanity check sums
    print("=== base_slices sums (minutes) ===")
    for row in base_slices:
        s = sum(row["categoryMinutes"].values())
        print(f"{row['ageGroup']:>6} / {row['gender']:<6} : {round(s,1)}")

    with open(os.path.join(OUT_DIR, "base_slices.json"), "w") as f:
        json.dump(base_slices, f, indent=2)

    # ---------- tier1_crosstabs.json ----------
    edu_note = ("U.S. population 25 years and over, 2025 annual averages. Source: BLS ATUS Table 3 "
                "(Educational attainment section). Table 3 embeds travel time inside each parent category, so "
                "commute could not be isolated and is reported as 0 (folded into paid_work/household/shopping/etc). "
                "Table 3/11A do not cross educational attainment with the TV-vs-other leisure split, so per the task's "
                "fallback instruction the full leisure+telephone bucket is placed in socializing (screen_leisure=0, "
                "exercise=0 for these rows). Sleep was estimated via the same national sleep-share-of-personal-care "
                "ratio described for the age rows (documented estimate, not directly transcribed by education level).")

    education_rows = [
        {
            "level": "below_secondary",
            "categoryMinutes": build_row_from_t3(T3_EDUCATION["below_secondary"], None),
            "sampleNote": edu_note + " Maps to ATUS's 'Less than a high school diploma'.",
        },
        {
            "level": "secondary",
            "categoryMinutes": build_row_from_t3(T3_EDUCATION["secondary"], None),
            "sampleNote": edu_note + " Maps to ATUS's 'High school graduates, no college'. NOTE: ATUS also publishes a "
                          "separate 'Some college or associate degree' bucket (partial tertiary) that doesn't cleanly "
                          "fit either our 'secondary' or 'tertiary' bucket; we excluded it from this crosstab rather "
                          "than force-fit it. Its transcribed total is 9.60/1.15/2.21/0.79/0.53/0.22/3.21/0.09/0.26/5.47/0.19/0.28 "
                          "(hours/day, same 12-column Table 3 order) for reference.",
        },
        {
            "level": "tertiary",
            "categoryMinutes": build_row_from_t3(T3_EDUCATION["tertiary"], None),
            "sampleNote": edu_note + " Maps to ATUS's 'Bachelor's degree and higher' (includes both 'Bachelor's degree "
                          "only' and 'Advanced degree' sub-rows, which ATUS also publishes separately).",
        },
    ]

    employment_note = ("BLS's standard 2025 ATUS news release tables do NOT publish a marginal employment-status "
                        "crosstab (employed / unemployed / not_in_labor_force / retired / student) with the full "
                        "12-14 category breakdown for the general population -- the closest published breakdowns are "
                        "(a) Table 11A's 'Employment status' section, which gives ONLY the leisure-and-sports "
                        "sub-categories (not the full activity list) for 'Employed' vs 'Not employed', and (b) Tables "
                        "8B/8C, which give the full activity list for employed/not-employed but ONLY conditional on "
                        "presence and age of household children (not a clean marginal). Fabricating a full-category "
                        "row from these partial slices was avoided per instructions. See caveats.")

    tier1 = {
        "employment": [],
        "education": education_rows,
        "income": [],
    }

    with open(os.path.join(OUT_DIR, "tier1_crosstabs.json"), "w") as f:
        json.dump(tier1, f, indent=2)

    print()
    print("=== tier1 education sums (minutes) ===")
    for row in education_rows:
        s = sum(row["categoryMinutes"].values())
        print(f"{row['level']:<16}: {round(s,1)}")

    print()
    print("employment_note (for caveats):", employment_note)

    return base_slices, tier1


if __name__ == "__main__":
    main()
