import type { ConfidenceBand, DataTier } from '../types';
import type { AppliedFactorSummary } from './composeAdjustments';

export interface ConfidenceResult {
  score: number;
  band: ConfidenceBand;
  explanation: string;
}

// T (base tier) x (0.35*Agreement + 0.35*StackingDepth + 0.30*Distance).
// See the estimation methodology: agreement comes from how consistently
// Tier-1 countries support a factor's direction/magnitude, stacking depth
// penalizes compounding multiple estimated filters, and distance reflects
// whether the target country needed to fall back to a global (vs.
// income-group) pool of source countries.
export function scoreConfidence(
  tier: DataTier,
  appliedFactors: AppliedFactorSummary[],
  usedGlobalFallback: boolean
): ConfidenceResult {
  const T = tier === 1 ? 1.0 : tier === 2 ? 0.7 : 0.4;
  const k = appliedFactors.length;
  const S = k === 0 ? 1.0 : 1 / Math.sqrt(k);
  const A = k === 0 ? 1.0 : appliedFactors.reduce((sum, f) => sum + f.agreement, 0) / k;
  const D = usedGlobalFallback ? 0.45 : tier === 1 ? 1.0 : 0.75;

  const score = T * (0.35 * A + 0.35 * S + 0.3 * D);
  const band: ConfidenceBand = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';

  const explanation =
    k === 0
      ? `Base tier ${tier} data with no additional filters applied.`
      : `Tier ${tier} base with ${k} stacked filter${k > 1 ? 's' : ''} (avg. cross-country agreement ${(A * 100).toFixed(0)}%)${usedGlobalFallback ? ', using a global fallback pool since too few source countries shared this target\'s income group' : ''}.`;

  return { score, band, explanation };
}
