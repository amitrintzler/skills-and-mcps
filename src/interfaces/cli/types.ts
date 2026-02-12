import type { CatalogKind, Recommendation } from '../../lib/validation/contracts.js';

export interface CatalogListRow {
  id: string;
  kind: CatalogKind;
  provider: string;
  riskTier: string;
  riskScore: number;
  blocked: boolean;
}

export interface RecommendationView extends Recommendation {
  rankBar: string;
  trustBar: string;
  riskBar: string;
}

export interface DoctorCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}
