import { loadSecurityPolicy } from '../config/runtime.js';
import {
  RiskAssessmentSchema,
  type CatalogItem,
  type RiskAssessment,
  type RiskTier,
  type SecurityPolicy
} from '../lib/validation/contracts.js';

export async function assessRisk(record: CatalogItem): Promise<RiskAssessment> {
  const policy = await loadSecurityPolicy();
  return buildAssessment(record, policy);
}

export function buildAssessment(record: CatalogItem, policy: SecurityPolicy): RiskAssessment {
  const signals = record.securitySignals;
  const scoring = policy.scoring;

  const vulnerabilityPoints = signals.knownVulnerabilities * scoring.vulnerabilityWeight;
  const suspiciousPoints = signals.suspiciousPatterns * scoring.suspiciousWeight;
  const injectionPoints = signals.injectionFindings * scoring.injectionWeight;
  const exfiltrationPoints = signals.exfiltrationSignals * scoring.exfiltrationWeight;
  const integrityPoints = signals.integrityAlerts * scoring.integrityWeight;

  const riskScore = Math.min(
    100,
    vulnerabilityPoints + suspiciousPoints + injectionPoints + exfiltrationPoints + integrityPoints
  );

  const riskTier = mapRiskTier(riskScore, policy);

  const reasons = [
    `Integrity alerts: ${signals.integrityAlerts}`,
    `Known vulnerabilities: ${signals.knownVulnerabilities}`,
    `Suspicious patterns: ${signals.suspiciousPatterns}`,
    `Injection findings: ${signals.injectionFindings}`,
    `Exfiltration signals: ${signals.exfiltrationSignals}`
  ];

  return RiskAssessmentSchema.parse({
    id: record.id,
    riskScore,
    riskTier,
    reasons,
    scannerResults: {
      packageIntegrity: { findings: signals.integrityAlerts },
      vulnerabilityIntel: { findings: signals.knownVulnerabilities },
      permissionPatterns: { findings: signals.suspiciousPatterns },
      injectionTests: { findings: signals.injectionFindings },
      exfiltrationHeuristics: { findings: signals.exfiltrationSignals }
    },
    assessedAt: new Date().toISOString()
  });
}

export function mapRiskTier(score: number, policy: SecurityPolicy): RiskTier {
  if (score <= policy.thresholds.lowMax) {
    return 'low';
  }

  if (score <= policy.thresholds.mediumMax) {
    return 'medium';
  }

  if (score <= policy.thresholds.highMax) {
    return 'high';
  }

  return 'critical';
}

export function isBlockedTier(tier: RiskTier, policy: SecurityPolicy): boolean {
  return policy.installGate.blockTiers.includes(tier);
}

export function isWarnTier(tier: RiskTier, policy: SecurityPolicy): boolean {
  return policy.installGate.warnTiers.includes(tier);
}
