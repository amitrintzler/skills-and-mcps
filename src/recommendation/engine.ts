import { loadRankingPolicy, loadSecurityPolicy } from '../config/runtime.js';
import { loadCatalogItems, loadQuarantine } from '../catalog/repository.js';
import {
  RecommendationSchema,
  type CatalogItem,
  type CatalogKind,
  type Recommendation,
  type RankingPolicy,
  type RequirementsProfile,
  type SecurityPolicy
} from '../lib/validation/contracts.js';
import type { ProjectSignals } from './project-analysis.js';
import { buildAssessment, isBlockedTier } from '../security/assessment.js';

export async function recommend(options: {
  projectSignals: ProjectSignals;
  requirements: RequirementsProfile;
  kinds?: CatalogKind[];
}): Promise<Recommendation[]> {
  const [items, quarantinedEntries, rankingPolicy, securityPolicy] = await Promise.all([
    loadCatalogItems(),
    loadQuarantine(),
    loadRankingPolicy(),
    loadSecurityPolicy()
  ]);

  const kindFilter = options.kinds?.length ? new Set(options.kinds) : null;
  const filteredItems = kindFilter ? items.filter((item) => kindFilter.has(item.kind)) : items;

  const quarantinedIds = new Set(quarantinedEntries.map((entry) => entry.id));

  return filteredItems
    .map((candidate) =>
      rankCandidate(candidate, options.projectSignals, options.requirements, rankingPolicy, securityPolicy, quarantinedIds)
    )
    .sort(sortRecommendations);
}

function rankCandidate(
  candidate: CatalogItem,
  projectSignals: ProjectSignals,
  requirements: RequirementsProfile,
  rankingPolicy: RankingPolicy,
  securityPolicy: SecurityPolicy,
  quarantinedIds: Set<string>
): Recommendation {
  const assessment = buildAssessment(candidate, securityPolicy);
  const effectiveRequiredCapabilities = dedupe([
    ...requirements.requiredCapabilities,
    ...projectSignals.inferredCapabilities
  ]);

  const compatibilityScore = overlapScore(candidate.compatibility, [
    ...projectSignals.compatibilityTags,
    ...requirements.stack
  ]);
  const capabilityScore = overlapScore(candidate.capabilities, effectiveRequiredCapabilities);
  const inferredCapabilityMatches = countMatches(candidate.capabilities, projectSignals.inferredCapabilities);

  const fitScore =
    compatibilityScore * (rankingPolicy.weights.compatibility / 100) +
    capabilityScore * (rankingPolicy.weights.capabilityCoverage / 100);

  const trustScore =
    candidate.maintenanceSignal * (rankingPolicy.weights.maintenance / 100) +
    candidate.provenanceSignal * (rankingPolicy.weights.provenance / 100) +
    candidate.adoptionSignal * (rankingPolicy.weights.adoption / 100);

  const freshnessBonus = (candidate.freshnessSignal / 100) * rankingPolicy.weights.freshnessBonusMax;
  const securityPenalty = (assessment.riskScore / 100) * rankingPolicy.weights.securityPenaltyMax;

  const blockedByPolicy = isBlockedTier(assessment.riskTier, securityPolicy);
  const blockedByQuarantine = quarantinedIds.has(candidate.id);
  const blocked = blockedByPolicy || blockedByQuarantine;
  const blockedPenalty = blocked ? rankingPolicy.weights.blockedPenalty : 0;

  const rawRank = fitScore + trustScore + freshnessBonus - securityPenalty - blockedPenalty;
  const rankScore = Math.max(0, Math.min(100, rawRank));

  const fitReasons = [
    `Project archetype: ${projectSignals.inferredArchetype} (${projectSignals.inferenceConfidence}% confidence)`,
    `Compatibility overlap: ${compatibilityScore.toFixed(1)}`,
    `Capability coverage: ${capabilityScore.toFixed(1)}`,
    `Inferred capability matches: ${inferredCapabilityMatches}`,
    `Repo evidence signals: ${projectSignals.scanEvidence.length}`,
    `Maintenance signal: ${candidate.maintenanceSignal}`,
    `Provenance signal: ${candidate.provenanceSignal}`,
    `Adoption signal: ${candidate.adoptionSignal}`
  ];

  const blockReason = blockedByQuarantine
    ? 'Quarantined by whitelist verification'
    : blockedByPolicy
      ? `Blocked by security policy tier: ${assessment.riskTier}`
      : undefined;

  return RecommendationSchema.parse({
    id: candidate.id,
    kind: candidate.kind,
    provider: candidate.provider,
    rankScore,
    fitReasons,
    scoreBreakdown: {
      fitScore: round(fitScore),
      trustScore: round(trustScore),
      securityPenalty: round(securityPenalty),
      freshnessBonus: round(freshnessBonus),
      blockedPenalty: round(blockedPenalty)
    },
    riskTier: assessment.riskTier,
    riskScore: assessment.riskScore,
    blocked,
    blockReason,
    installMethod: candidate.install.kind
  });
}

function sortRecommendations(a: Recommendation, b: Recommendation): number {
  const primary = b.rankScore - a.rankScore;
  if (primary !== 0) {
    return primary;
  }

  const trustA = a.scoreBreakdown.trustScore;
  const trustB = b.scoreBreakdown.trustScore;
  const trustDiff = trustB - trustA;
  if (trustDiff !== 0) {
    return trustDiff;
  }

  const riskDiff = a.riskScore - b.riskScore;
  if (riskDiff !== 0) {
    return riskDiff;
  }

  return a.id.localeCompare(b.id);
}

function overlapScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  const matches = left.filter((value) => rightSet.has(value.toLowerCase())).length;
  return (matches / Math.max(left.length, right.length)) * 100;
}

function countMatches(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase())).length;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
