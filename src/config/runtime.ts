import path from 'node:path';

import { readJsonFile } from '../lib/json.js';
import {
  ProvidersFileSchema,
  RankingPolicySchema,
  RecommendationWeightsSchema,
  RegistriesFileSchema,
  SecurityPolicySchema,
  type ProviderConfig,
  type RankingPolicy,
  type Registry,
  type SecurityPolicy
} from '../lib/validation/contracts.js';

const REGISTRIES_PATH = path.resolve('config/registries.json');
const SECURITY_POLICY_PATH = path.resolve('config/security-policy.json');
const RANKING_POLICY_PATH = path.resolve('config/ranking-policy.json');
const RECOMMENDATION_WEIGHTS_PATH = path.resolve('config/recommendation-weights.json');
const PROVIDERS_PATH = path.resolve('config/providers.json');

export async function loadRegistries(): Promise<Registry[]> {
  const raw = await readJsonFile<unknown>(REGISTRIES_PATH);
  const parsed = RegistriesFileSchema.parse(raw);
  return parsed.registries.filter((registry) => registry.enabled);
}

export async function loadSecurityPolicy(): Promise<SecurityPolicy> {
  const raw = await readJsonFile<unknown>(SECURITY_POLICY_PATH);
  return SecurityPolicySchema.parse(raw);
}

export async function loadRankingPolicy(): Promise<RankingPolicy> {
  try {
    const raw = await readJsonFile<unknown>(RANKING_POLICY_PATH);
    return RankingPolicySchema.parse(raw);
  } catch {
    const fallback = RecommendationWeightsSchema.parse(await readJsonFile<unknown>(RECOMMENDATION_WEIGHTS_PATH));
    return RankingPolicySchema.parse({
      weights: {
        compatibility: fallback.compatibility,
        capabilityCoverage: fallback.capabilityCoverage,
        maintenance: fallback.maintenance,
        provenance: 18,
        adoption: fallback.adoption,
        freshnessBonusMax: 8,
        securityPenaltyMax: fallback.securityPenaltyMax,
        blockedPenalty: 40
      },
      tieBreakers: ['trust', 'risk', 'name'],
      blockedFloorTier: 'high'
    });
  }
}

export async function loadProviders(): Promise<Map<string, ProviderConfig>> {
  const raw = await readJsonFile<unknown>(PROVIDERS_PATH);
  const parsed = ProvidersFileSchema.parse(raw);
  return new Map(parsed.providers.filter((provider) => provider.enabled).map((provider) => [provider.id, provider]));
}
