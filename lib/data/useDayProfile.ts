'use client';

import { useEffect, useState } from 'react';
import type { DayProfile, FilterSelection } from '../types';
import { resolveProfile } from './resolveProfile';

export interface DayProfileState {
  profile: DayProfile | null;
  loading: boolean;
  error: string | null;
}

export function useDayProfile(filters: FilterSelection): DayProfileState {
  const [state, setState] = useState<DayProfileState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    resolveProfile(filters)
      .then((profile) => {
        if (!cancelled) setState({ profile, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ profile: null, loading: false, error: err instanceof Error ? err.message : String(err) });
      });

    return () => {
      cancelled = true;
    };
  }, [
    filters.country,
    filters.ageGroup,
    filters.gender,
    filters.employment,
    filters.education,
    filters.income,
    filters.urbanRural,
  ]);

  return state;
}
