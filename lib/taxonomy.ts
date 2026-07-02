import type { ActivityCategory } from './types';

export interface CategoryMeta {
  id: ActivityCategory;
  label: string;
  shortLabel: string; // for tight spaces like the radial clock legend
  color: string; // hex, chosen for colorblind-safe distinction
  description: string;
  // ATUS Tier-1 major activity codes (bls.gov/tus/lexicons) rolled up into
  // this broad category, for reference when building the ingestion crosswalk.
  atusMajorCodes: string[];
}

// ~14 broad categories, matching the "broad top-level only" scope decision.
// Ordering here is the canonical display/stacking order used across every
// visualization (radial clock, timeline, summary charts) so segment colors
// stay consistent regardless of view.
export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'sleep',
    label: 'Sleep',
    shortLabel: 'Sleep',
    color: '#2b3a67',
    description: 'Sleeping and time spent in bed not otherwise engaged.',
    atusMajorCodes: ['0101'],
  },
  {
    id: 'personal_care',
    label: 'Personal Care',
    shortLabel: 'Care',
    color: '#5b7fb5',
    description: 'Grooming, hygiene, health-related self-care.',
    atusMajorCodes: ['0102', '0103', '0104', '08'],
  },
  {
    id: 'eating',
    label: 'Eating & Drinking',
    shortLabel: 'Eating',
    color: '#e8a838',
    description: 'Meals and beverage consumption.',
    atusMajorCodes: ['11'],
  },
  {
    id: 'paid_work',
    label: 'Paid Work',
    shortLabel: 'Work',
    color: '#c1443c',
    description: 'Main job, second jobs, work-related activities and job search.',
    atusMajorCodes: ['05', '35'],
  },
  {
    id: 'education',
    label: 'Education',
    shortLabel: 'Study',
    color: '#8e5fb0',
    description: 'Class time, homework, and other education activities.',
    atusMajorCodes: ['06'],
  },
  {
    id: 'household',
    label: 'Household & Chores',
    shortLabel: 'Chores',
    color: '#6f9954',
    description: 'Housework, cooking, cleaning, home maintenance, household management.',
    atusMajorCodes: ['02', '09'],
  },
  {
    id: 'caregiving',
    label: 'Caregiving',
    shortLabel: 'Care+',
    color: '#4fa5a0',
    description: 'Caring for children, elderly, or other household and non-household members.',
    atusMajorCodes: ['03', '04'],
  },
  {
    id: 'shopping',
    label: 'Shopping & Errands',
    shortLabel: 'Errands',
    color: '#b58900',
    description: 'Consumer purchases, grocery shopping, and related errands.',
    atusMajorCodes: ['07'],
  },
  {
    id: 'commute',
    label: 'Travel & Commute',
    shortLabel: 'Travel',
    color: '#7a7a7a',
    description: 'Travel associated with any activity, including the commute to work.',
    atusMajorCodes: ['18'],
  },
  {
    id: 'screen_leisure',
    label: 'Screen Time & Media',
    shortLabel: 'Screens',
    color: '#3d84a8',
    description: 'TV, streaming, gaming, and other screen- or media-based leisure.',
    atusMajorCodes: ['1203'],
  },
  {
    id: 'socializing',
    label: 'Socializing',
    shortLabel: 'Social',
    color: '#d46fa3',
    description: 'In-person and phone-based socializing and relaxing with others.',
    atusMajorCodes: ['12', '16'],
  },
  {
    id: 'exercise',
    label: 'Exercise & Sports',
    shortLabel: 'Exercise',
    color: '#59a14f',
    description: 'Sports, exercise, and recreational physical activity.',
    atusMajorCodes: ['13'],
  },
  {
    id: 'civic_religious',
    label: 'Civic, Religious & Volunteer',
    shortLabel: 'Civic',
    color: '#9c755f',
    description: 'Religious practice, volunteering, and civic/government-related activities.',
    atusMajorCodes: ['10', '14', '15'],
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    color: '#bab0ac',
    description: 'Activities that do not fit elsewhere or are unclassified in the source data.',
    atusMajorCodes: ['50'],
  },
];

export const CATEGORY_ORDER: ActivityCategory[] = CATEGORIES.map((c) => c.id);

export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<ActivityCategory, CategoryMeta>;

export function categoryColor(id: ActivityCategory): string {
  return CATEGORY_META[id].color;
}
