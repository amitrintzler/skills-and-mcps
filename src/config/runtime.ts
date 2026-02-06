import path from 'node:path';

import { readJsonFile } from '../lib/json.js';
import {
  RecommendationWeightsSchema,
  RegistriesFileSchema,
  SecurityPolicySchema,
  type RecommendationWeights,
  type Registry,
  type SecurityPolicy
} from '../lib/validation/contracts.js';

const REGISTRIES_PATH = path.resolve('config/registries.json');
const SECURITY_POLICY_PATH = path.resolve('config/security-policy.json');
const RECOMMENDATION_WEIGHTS_PATH = path.resolve('config/recommendation-weights.json');

export async function loadRegistries(): Promise<Registry[]> {
  const raw = await readJsonFile<unknown>(REGISTRIES_PATH);
  const parsed = RegistriesFileSchema.parse(raw);
  return parsed.registries.filter((registry) => registry.enabled);
}

export async function loadSecurityPolicy(): Promise<SecurityPolicy> {
  const raw = await readJsonFile<unknown>(SECURITY_POLICY_PATH);
  return SecurityPolicySchema.parse(raw);
}

export async function loadRecommendationWeights(): Promise<RecommendationWeights> {
  const raw = await readJsonFile<unknown>(RECOMMENDATION_WEIGHTS_PATH);
  return RecommendationWeightsSchema.parse(raw);
}
