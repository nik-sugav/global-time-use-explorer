'use client';

import { useQueryStates } from 'nuqs';
import { useMemo } from 'react';
import type { FilterSelection } from '../types';
import { comparisonFilterParsers, compareFlagParser, primaryFilterParsers } from './filterParsers';

function toFilterSelection(raw: Record<string, string>, prefix: string): FilterSelection {
  return {
    country: raw[`${prefix}country`] as FilterSelection['country'],
    ageGroup: raw[`${prefix}age`] as FilterSelection['ageGroup'],
    gender: raw[`${prefix}gender`] as FilterSelection['gender'],
    employment: raw[`${prefix}employment`] as FilterSelection['employment'],
    education: raw[`${prefix}education`] as FilterSelection['education'],
    income: raw[`${prefix}income`] as FilterSelection['income'],
    urbanRural: raw[`${prefix}urban`] as FilterSelection['urbanRural'],
  };
}

export function useFilterState() {
  const [primaryRaw, setPrimaryRaw] = useQueryStates(primaryFilterParsers);
  const [comparisonRaw, setComparisonRaw] = useQueryStates(comparisonFilterParsers);
  const [compareState, setCompareState] = useQueryStates(compareFlagParser);

  const primary = useMemo(() => toFilterSelection(primaryRaw, ''), [primaryRaw]);
  const comparison = useMemo(() => toFilterSelection(comparisonRaw, 'b_'), [comparisonRaw]);

  function updatePrimary(patch: Partial<FilterSelection>) {
    setPrimaryRaw({
      country: patch.country,
      age: patch.ageGroup,
      gender: patch.gender,
      employment: patch.employment,
      education: patch.education,
      income: patch.income,
      urban: patch.urbanRural,
    });
  }

  function updateComparison(patch: Partial<FilterSelection>) {
    setComparisonRaw({
      b_country: patch.country,
      b_age: patch.ageGroup,
      b_gender: patch.gender,
      b_employment: patch.employment,
      b_education: patch.education,
      b_income: patch.income,
      b_urban: patch.urbanRural,
    });
  }

  function setCompareEnabled(enabled: boolean) {
    setCompareState({ compare: enabled });
  }

  return {
    primary,
    comparison,
    compareEnabled: compareState.compare,
    updatePrimary,
    updateComparison,
    setCompareEnabled,
  };
}
