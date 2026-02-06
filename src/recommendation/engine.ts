import { loadRecommendationWeights, loadSecurityPolicy } from '../config/runtime.js';
import { loadMcpsCatalog, loadQuarantine, loadSkillsCatalog } from '../catalog/repository.js';
import {
  RecommendationSchema,
  type CatalogMcpServer,
  type CatalogSkill,
  type Recommendation,
  type RecommendationWeights,
  type RequirementsProfile,
  type SecurityPolicy
} from '../lib/validation/contracts.js';
import type { ProjectSignals } from './project-analysis.js';
import { buildAssessment, isBlockedTier } from '../security/assessment.js';

type Candidate =
  | { kind: 'skill'; item: CatalogSkill }
  | { kind: 'mcp'; item: CatalogMcpServer };

export async function recommend(options: {
  projectSignals: ProjectSignals;
  requirements: RequirementsProfile;
}): Promise<Recommendation[]> {
  const [skills, mcps, quarantinedEntries, weights, policy] = await Promise.all([
    loadSkillsCatalog(),
    loadMcpsCatalog(),
    loadQuarantine(),
    loadRecommendationWeights(),
    loadSecurityPolicy()
  ]);

  const quarantinedIds = new Set(quarantinedEntries.map((entry) => entry.id));
  const candidates: Candidate[] = [
    ...skills.map((item) => ({ kind: 'skill' as const, item })),
    ...mcps.map((item) => ({ kind: 'mcp' as const, item }))
  ];

  return candidates
    .map((candidate) => rankCandidate(candidate, options.projectSignals, options.requirements, weights, policy, quarantinedIds))
    .sort((a, b) => b.rankScore - a.rankScore || a.id.localeCompare(b.id));
}

function rankCandidate(
  candidate: Candidate,
  projectSignals: ProjectSignals,
  requirements: RequirementsProfile,
  weights: RecommendationWeights,
  policy: SecurityPolicy,
  quarantinedIds: Set<string>
): Recommendation {
  const assessment = buildAssessment(candidate.item, policy);

  const compatibilityScore = overlapScore(candidate.item.compatibility, [
    ...projectSignals.compatibilityTags,
    ...requirements.stack
  ]);
  const capabilityScore = overlapScore(candidate.item.capabilities, requirements.requiredCapabilities);

  const weighted =
    compatibilityScore * (weights.compatibility / 100) +
    capabilityScore * (weights.capabilityCoverage / 100) +
    candidate.item.maintenanceSignal * (weights.maintenance / 100) +
    candidate.item.adoptionSignal * (weights.adoption / 100);

  const penalty = (assessment.riskScore / 100) * weights.securityPenaltyMax;
  const rankScore = Math.max(0, Math.min(100, weighted - penalty));
  const blocked = quarantinedIds.has(candidate.item.id) || isBlockedTier(assessment.riskTier, policy);

  const fitReasons = [
    `Compatibility overlap: ${compatibilityScore.toFixed(1)}`,
    `Capability coverage: ${capabilityScore.toFixed(1)}`,
    `Maintenance signal: ${candidate.item.maintenanceSignal}`,
    `Adoption signal: ${candidate.item.adoptionSignal}`
  ];

  return RecommendationSchema.parse({
    id: candidate.item.id,
    kind: candidate.kind,
    rankScore,
    fitReasons,
    riskTier: assessment.riskTier,
    riskScore: assessment.riskScore,
    blocked,
    installMethod: 'skill.sh'
  });
}

function overlapScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  const matches = left.filter((value) => rightSet.has(value.toLowerCase())).length;
  return (matches / Math.max(left.length, right.length)) * 100;
}
