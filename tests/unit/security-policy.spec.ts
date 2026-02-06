import { describe, expect, it } from 'vitest';

import { buildAssessment, mapRiskTier } from '../../src/security/assessment.js';
import { SecurityPolicySchema } from '../../src/lib/validation/contracts.js';

const policy = SecurityPolicySchema.parse({
  thresholds: { lowMax: 24, mediumMax: 49, highMax: 74, criticalMax: 100 },
  installGate: { blockTiers: ['high', 'critical'], warnTiers: ['medium'] },
  scoring: {
    vulnerabilityWeight: 15,
    suspiciousWeight: 10,
    injectionWeight: 12,
    exfiltrationWeight: 12,
    integrityWeight: 10
  }
});

describe('mapRiskTier', () => {
  it('maps risk scores into expected tier boundaries', () => {
    expect(mapRiskTier(0, policy)).toBe('low');
    expect(mapRiskTier(24, policy)).toBe('low');
    expect(mapRiskTier(25, policy)).toBe('medium');
    expect(mapRiskTier(50, policy)).toBe('high');
    expect(mapRiskTier(99, policy)).toBe('critical');
  });
});

describe('buildAssessment', () => {
  it('produces score/tier and scanner categories', () => {
    const assessment = buildAssessment(
      {
        id: 'skill:test',
        name: 'Test',
        description: 'desc',
        capabilities: ['x'],
        compatibility: ['node'],
        source: 'x',
        lastSeenAt: '2026-02-06',
        install: { kind: 'skill.sh', target: 'x', args: [] },
        adoptionSignal: 50,
        maintenanceSignal: 50,
        securitySignals: {
          knownVulnerabilities: 1,
          suspiciousPatterns: 1,
          injectionFindings: 1,
          exfiltrationSignals: 1,
          integrityAlerts: 1
        }
      },
      policy
    );

    expect(assessment.riskScore).toBe(59);
    expect(assessment.riskTier).toBe('high');
    expect(assessment.scannerResults.injectionTests.findings).toBe(1);
  });
});
