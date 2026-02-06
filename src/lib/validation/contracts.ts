import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^(19|20|21)\d{2}-[01]\d-[0-3]\d$/, 'Expected ISO date (YYYY-MM-DD)');

export const RiskTierSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const InstallMethodSchema = z.object({
  kind: z.literal('skill.sh'),
  target: z.string().min(1),
  args: z.array(z.string()).default([])
});

export const CatalogSkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  compatibility: z.array(z.string().min(1)).default([]),
  source: z.string().min(1),
  lastSeenAt: isoDate,
  install: InstallMethodSchema,
  adoptionSignal: z.number().min(0).max(100).default(50),
  maintenanceSignal: z.number().min(0).max(100).default(50),
  securitySignals: z
    .object({
      knownVulnerabilities: z.number().int().min(0).default(0),
      suspiciousPatterns: z.number().int().min(0).default(0),
      injectionFindings: z.number().int().min(0).default(0),
      exfiltrationSignals: z.number().int().min(0).default(0),
      integrityAlerts: z.number().int().min(0).default(0)
    })
    .default({})
});

export const CatalogMcpServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  transport: z.enum(['stdio', 'http', 'sse', 'websocket']),
  authModel: z.enum(['none', 'api_key', 'oauth', 'custom']),
  capabilities: z.array(z.string().min(1)).default([]),
  compatibility: z.array(z.string().min(1)).default([]),
  source: z.string().min(1),
  lastSeenAt: isoDate,
  install: InstallMethodSchema,
  adoptionSignal: z.number().min(0).max(100).default(50),
  maintenanceSignal: z.number().min(0).max(100).default(50),
  securitySignals: z
    .object({
      knownVulnerabilities: z.number().int().min(0).default(0),
      suspiciousPatterns: z.number().int().min(0).default(0),
      injectionFindings: z.number().int().min(0).default(0),
      exfiltrationSignals: z.number().int().min(0).default(0),
      integrityAlerts: z.number().int().min(0).default(0)
    })
    .default({})
});

export const RiskAssessmentSchema = z.object({
  id: z.string().min(1),
  riskScore: z.number().min(0).max(100),
  riskTier: RiskTierSchema,
  reasons: z.array(z.string().min(1)).nonempty(),
  scannerResults: z.object({
    packageIntegrity: z.object({ findings: z.number().int().min(0) }),
    vulnerabilityIntel: z.object({ findings: z.number().int().min(0) }),
    permissionPatterns: z.object({ findings: z.number().int().min(0) }),
    injectionTests: z.object({ findings: z.number().int().min(0) }),
    exfiltrationHeuristics: z.object({ findings: z.number().int().min(0) })
  }),
  assessedAt: z.string().datetime()
});

export const RecommendationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['skill', 'mcp']),
  rankScore: z.number().min(0).max(100),
  fitReasons: z.array(z.string().min(1)).nonempty(),
  riskTier: RiskTierSchema,
  riskScore: z.number().min(0).max(100),
  blocked: z.boolean(),
  installMethod: z.literal('skill.sh')
});

export const InstallAuditSchema = z.object({
  id: z.string().min(1),
  requestedAt: z.string().datetime(),
  policyDecision: z.enum(['allowed', 'blocked', 'override-allowed']),
  overrideUsed: z.boolean(),
  installer: z.literal('skill.sh'),
  exitCode: z.number().int()
});

export const RemoteRegistrySchema = z.object({
  url: z.string().url(),
  format: z.enum(['json-array', 'catalog-json']).default('json-array'),
  entryPath: z.string().min(1).optional(),
  supportsUpdatedSince: z.boolean().default(false),
  updatedSinceParam: z.string().min(1).default('updated_since'),
  pagination: z
    .object({
      mode: z.literal('cursor').default('cursor'),
      cursorParam: z.string().min(1).default('cursor'),
      nextCursorPath: z.string().min(1).default('next_cursor'),
      limitParam: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(1000).optional()
    })
    .optional(),
  timeoutMs: z.number().int().min(100).max(120000).default(10000),
  authEnv: z.string().min(1).optional(),
  fallbackToLocal: z.boolean().default(true)
});

export const RegistrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['skill', 'mcp']),
  sourceType: z.enum(['public-index', 'vendor-feed', 'community-list']),
  adapter: z.enum(['direct', 'mcp-registry-v0.1']).default('direct'),
  enabled: z.boolean().default(true),
  entries: z.array(z.unknown()).default([]),
  remote: RemoteRegistrySchema.optional()
});

export const RegistriesFileSchema = z.object({
  registries: z.array(RegistrySchema)
});

export const SecurityPolicySchema = z.object({
  thresholds: z.object({
    lowMax: z.number().int().min(0).max(100).default(24),
    mediumMax: z.number().int().min(0).max(100).default(49),
    highMax: z.number().int().min(0).max(100).default(74),
    criticalMax: z.number().int().min(0).max(100).default(100)
  }),
  installGate: z.object({
    blockTiers: z.array(RiskTierSchema).default(['high', 'critical']),
    warnTiers: z.array(RiskTierSchema).default(['medium'])
  }),
  scoring: z.object({
    vulnerabilityWeight: z.number().int().min(1).default(15),
    suspiciousWeight: z.number().int().min(1).default(10),
    injectionWeight: z.number().int().min(1).default(12),
    exfiltrationWeight: z.number().int().min(1).default(12),
    integrityWeight: z.number().int().min(1).default(10)
  })
});

export const RecommendationWeightsSchema = z.object({
  compatibility: z.number().min(0).max(100).default(40),
  capabilityCoverage: z.number().min(0).max(100).default(25),
  maintenance: z.number().min(0).max(100).default(15),
  adoption: z.number().min(0).max(100).default(10),
  securityPenaltyMax: z.number().min(0).max(100).default(30)
});

export const RequirementsProfileSchema = z.object({
  useCase: z.string().default('general'),
  stack: z.array(z.string()).default([]),
  deployment: z.string().default('local'),
  securityPosture: z.enum(['balanced', 'strict']).default('balanced'),
  requiredCapabilities: z.array(z.string()).default([])
});

export const WhitelistFileSchema = z.object({
  approved: z.array(z.string().min(1)).default([])
});

export const QuarantineEntrySchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
  quarantinedAt: z.string().datetime()
});

export const QuarantineFileSchema = z.object({
  quarantined: z.array(QuarantineEntrySchema).default([])
});

export const SecurityReportSchema = z.object({
  generatedAt: z.string().datetime(),
  passed: z.array(z.string()).default([]),
  failed: z
    .array(
      z.object({
        id: z.string().min(1),
        riskTier: RiskTierSchema,
        riskScore: z.number().min(0).max(100),
        reasons: z.array(z.string()).nonempty()
      })
    )
    .default([])
});

export type CatalogSkill = z.infer<typeof CatalogSkillSchema>;
export type CatalogMcpServer = z.infer<typeof CatalogMcpServerSchema>;
export type RiskTier = z.infer<typeof RiskTierSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type InstallAudit = z.infer<typeof InstallAuditSchema>;
export type Registry = z.infer<typeof RegistrySchema>;
export type RemoteRegistryConfig = z.infer<typeof RemoteRegistrySchema>;
export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;
export type RecommendationWeights = z.infer<typeof RecommendationWeightsSchema>;
export type RequirementsProfile = z.infer<typeof RequirementsProfileSchema>;
export type SecurityReport = z.infer<typeof SecurityReportSchema>;
export type QuarantineEntry = z.infer<typeof QuarantineEntrySchema>;
