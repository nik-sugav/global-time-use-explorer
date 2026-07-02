import { parseAsStringEnum, parseAsString, parseAsBoolean } from 'nuqs';
import type { AgeGroup, EducationLevel, EmploymentStatus, Gender, IncomeLevel, UrbanRural } from '../types';

const AGE_GROUPS: AgeGroup[] = ['all', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDERS: Gender[] = ['all', 'male', 'female'];
const EMPLOYMENT: EmploymentStatus[] = ['all', 'employed', 'unemployed', 'not_in_labor_force', 'retired', 'student'];
const EDUCATION: EducationLevel[] = ['all', 'below_secondary', 'secondary', 'tertiary'];
const INCOME: IncomeLevel[] = ['all', 'low', 'middle', 'high'];
const URBAN_RURAL: UrbanRural[] = ['all', 'urban', 'rural'];

// Base filter parser group, reused for both the primary profile (unprefixed)
// and the comparison profile (b_-prefixed) so the two share one shape.
export function makeFilterParsers(prefix: string) {
  return {
    [`${prefix}country`]: parseAsString.withDefault('WLD'),
    [`${prefix}age`]: parseAsStringEnum<AgeGroup>(AGE_GROUPS).withDefault('all'),
    [`${prefix}gender`]: parseAsStringEnum<Gender>(GENDERS).withDefault('all'),
    [`${prefix}employment`]: parseAsStringEnum<EmploymentStatus>(EMPLOYMENT).withDefault('all'),
    [`${prefix}education`]: parseAsStringEnum<EducationLevel>(EDUCATION).withDefault('all'),
    [`${prefix}income`]: parseAsStringEnum<IncomeLevel>(INCOME).withDefault('all'),
    [`${prefix}urban`]: parseAsStringEnum<UrbanRural>(URBAN_RURAL).withDefault('all'),
  } as const;
}

export const primaryFilterParsers = makeFilterParsers('');
export const comparisonFilterParsers = makeFilterParsers('b_');

export const compareFlagParser = { compare: parseAsBoolean.withDefault(false) };
