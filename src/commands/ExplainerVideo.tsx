import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const palette = {
  bg: '#050b1a',
  bgGlow: '#12203a',
  panel: '#0f172a',
  panelBorder: '#2b3a55',
  text: '#e5e7eb',
  muted: '#93a4c0',
  accent: '#22d3ee',
  success: '#22c55e',
  warn: '#f59e0b',
  danger: '#ef4444',
  info: '#60a5fa'
};

const sceneDuration = 300;
const sceneCount = 11;

const FadeScene: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const local = useCurrentFrame();
  const fade = Math.min(24, Math.floor(duration * 0.1));
  const opacity = interpolate(local, [0, fade, duration - fade, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const toneColor = (tone: 'normal' | 'success' | 'warn' | 'danger' | 'info'): string => {
  if (tone === 'success') return palette.success;
  if (tone === 'warn') return palette.warn;
  if (tone === 'danger') return palette.danger;
  if (tone === 'info') return palette.info;
  return palette.muted;
};

const Panel: React.FC<{ title: string; tone?: 'normal' | 'success' | 'warn' | 'danger' | 'info'; children: React.ReactNode }> = ({
  title,
  tone = 'normal',
  children
}) => (
  <div
    style={{
      backgroundColor: palette.panel,
      border: `2px solid ${palette.panelBorder}`,
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
      height: '100%'
    }}
  >
    <div style={{ fontSize: 18, color: toneColor(tone), fontWeight: 700, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const TerminalBlock: React.FC<{ command: string; lines: string[]; tone?: 'normal' | 'success' | 'warn' | 'danger' | 'info' }> = ({
  command,
  lines,
  tone = 'normal'
}) => (
  <Panel title={`$ ${command}`} tone={tone}>
    <div style={{ display: 'grid', gap: 8 }}>
      {lines.map((line, index) => (
        <div
          key={`${index}-${line}`}
          style={{
            fontFamily: 'Menlo, Monaco, Consolas, monospace',
            fontSize: 18,
            whiteSpace: 'pre-wrap',
            color: index === lines.length - 1 ? toneColor(tone) : palette.text
          }}
        >
          {line}
        </div>
      ))}
    </div>
  </Panel>
);

const BulletBlock: React.FC<{ title: string; items: string[]; tone?: 'normal' | 'success' | 'warn' | 'danger' | 'info' }> = ({
  title,
  items,
  tone = 'info'
}) => (
  <Panel title={title} tone={tone}>
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item, index) => (
        <div key={`${index}-${item}`} style={{ fontSize: 20, color: palette.text, lineHeight: 1.35 }}>
          {`${index + 1}. ${item}`}
        </div>
      ))}
    </div>
  </Panel>
);

const SceneShell: React.FC<{
  title: string;
  subtitle: string;
  sceneNumber: number;
  kpis: string[];
  left: React.ReactNode;
  right: React.ReactNode;
  footer: string[];
}> = ({ title, subtitle, sceneNumber, kpis, left, right, footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 16 } });
  const pulse = interpolate(Math.sin(frame / 18), [-1, 1], [0.35, 0.75]);
  const completion = sceneNumber / sceneCount;

  return (
    <AbsoluteFill
      style={{
        fontFamily: 'ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
        color: palette.text,
        background: `radial-gradient(circle at 20% 20%, ${palette.bgGlow} 0%, ${palette.bg} 58%)`,
        padding: '34px 44px',
        gap: 18
      }}
    >
      <div
        style={{
          border: `1px solid ${palette.panelBorder}`,
          borderRadius: 12,
          padding: '10px 14px',
          backgroundColor: 'rgba(15,23,42,0.75)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 16, color: palette.accent, fontWeight: 700 }}>
            {`Walkthrough ${sceneNumber}/${sceneCount}`}
          </div>
          <div style={{ fontSize: 15, color: palette.muted }}>{'skills + mcp + plugin security intelligence framework'}</div>
        </div>
        <div style={{ height: 8, borderRadius: 999, backgroundColor: '#1e293b', overflow: 'hidden' }}>
          <div
            style={{
              width: `${completion * 100}%`,
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${palette.info} 0%, ${palette.accent} 100%)`,
              opacity: pulse
            }}
          />
        </div>
      </div>

      <div style={{ transform: `translateY(${(1 - rise) * 18}px)` }}>
        <h1 style={{ margin: 0, fontSize: 48, lineHeight: 1.08 }}>{title}</h1>
        <p style={{ margin: '10px 0 0 0', fontSize: 24, color: palette.accent }}>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {kpis.map((kpi, index) => (
          <div
            key={`${index}-${kpi}`}
            style={{
              border: `1px solid ${palette.panelBorder}`,
              borderRadius: 999,
              padding: '7px 12px',
              backgroundColor: 'rgba(15,23,42,0.82)',
              color: palette.text,
              fontSize: 15
            }}
          >
            {kpi}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <div style={{ minHeight: 0 }}>{left}</div>
        <div style={{ minHeight: 0 }}>{right}</div>
      </div>

      <div
        style={{
          border: `1px solid ${palette.panelBorder}`,
          borderRadius: 12,
          backgroundColor: 'rgba(15,23,42,0.82)',
          padding: '10px 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10
        }}
      >
        {footer.map((line, index) => (
          <div key={`${index}-${line}`} style={{ color: palette.muted, fontSize: 15 }}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const SceneIntro: React.FC = () => (
  <SceneShell
    sceneNumber={1}
    title="Complete Framework Overview"
    subtitle="One operating layer for discovery, trust-first ranking, and secure install paths"
    kpis={['4 ecosystem kinds', 'Daily sync + security checks', 'Trust-first scoring', 'Blocking risk gates']}
    left={
      <TerminalBlock
        command="npm run about"
        lines={[
          'skills-and-mcps v0.1.0',
          'Kinds: skill, mcp, claude-plugin, copilot-extension',
          'Default policy: official sources only',
          'Output modes: table | json | csv | md'
        ]}
      />
    }
    right={
      <BulletBlock
        title="What this walkthrough proves"
        items={[
          'Any project can onboard in minutes with init + doctor.',
          'Ranking combines fit, provenance, maintenance, adoption, and risk.',
          'Install paths are gated by security tiers and policy.',
          'CI continuously validates catalog integrity and supply-chain safety.'
        ]}
      />
    }
    footer={['Outcome: source-of-truth catalog', 'Audience: platform + app teams', 'Mode: automation-safe + human-friendly']}
  />
);

const SceneInit: React.FC = () => (
  <SceneShell
    sceneNumber={2}
    title="1) First-Run Init Wizard"
    subtitle="Local project defaults are generated automatically"
    kpis={['Writes .skills-mcps.json', 'Provider defaults', 'Risk posture preset', 'Optional initial sync']}
    left={
      <TerminalBlock
        command="npm run init -- --project ."
        tone="success"
        lines={[
          '? kinds: skill,mcp,claude-plugin,copilot-extension',
          '? providers: anthropic,github,mcp,openai',
          '? risk posture: strict',
          'Created .skills-mcps.json and initialized onboarding stamp'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Generated defaults"
        items={[
          'Preferred kinds and providers for this repository.',
          'Default output mode for human vs automation usage.',
          'Risk posture that controls installation policy.',
          'Onboarding state used by doctor and status.'
        ]}
        tone="success"
      />
    }
    footer={['Example file: .skills-mcps.json', 'No server required', 'Project-local and portable']}
  />
);

const SceneDoctor: React.FC = () => (
  <SceneShell
    sceneNumber={3}
    title="2) Doctor Diagnostics"
    subtitle="Fast environment validation before running catalog operations"
    kpis={['Pass/Warn/Fail summary', 'CLI dependency checks', 'Catalog freshness checks', 'Actionable fixes']}
    left={
      <TerminalBlock
        command="npm run doctor"
        tone="warn"
        lines={[
          'gh                 pass   installed and authenticated',
          'Node version       pass   22.x',
          'skill.sh           warn   missing (install optional)',
          'Catalog            pass   items loaded',
          'Sync freshness     pass   no stale registries'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Recommended fixes if warnings exist"
        items={[
          'Install missing binaries only for flows you use.',
          'Run sync if catalog or freshness checks fail.',
          'Use strict posture in production environments.',
          'Add doctor in CI preflight for operator confidence.'
        ]}
        tone="warn"
      />
    }
    footer={['Command latency: seconds', 'Human-readable by default', 'Machine parsing available via json']}
  />
);

const SceneSync: React.FC = () => (
  <SceneShell
    sceneNumber={4}
    title="3) Catalog Sync Across Providers"
    subtitle="Incremental ingestion, adapter normalization, deterministic merge"
    kpis={['Remote + local fallback', 'Adapter-based mapping', 'Stable ID merge', 'Dual-write compatibility']}
    left={
      <TerminalBlock
        command="npm run dev -- sync --kind mcp,skill,claude-plugin,copilot-extension"
        lines={[
          'community-skills-index        fetched=2 merged=2',
          'public-mcp-directory          fetched=2 merged=2',
          'official-claude-plugins       fetched=1 merged=1',
          'official-copilot-extensions   fetched=1 merged=1',
          'saved data/catalog/items.json + legacy split outputs'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Normalization pipeline"
        items={[
          'Resolve registry entries with updatedSince cursors.',
          'Apply provider adapter to common CatalogItem contract.',
          'Validate schema with Zod and reject malformed payloads.',
          'Persist unified catalog + compatibility views.'
        ]}
      />
    }
    footer={['Schedule: daily via Actions', 'Manual refresh: sync command', 'Stale registry threshold: 48h']}
  />
);

const SceneBrowse: React.FC = () => (
  <SceneShell
    sceneNumber={5}
    title="4) Discovery: List, Search, Show, Top"
    subtitle="Browse broadly, filter hard, inspect deeply"
    kpis={['Kind/provider filters', 'Search by capability', 'Detailed item view', 'Top picks by context']}
    left={
      <TerminalBlock
        command="npm run list -- --kind mcp --provider mcp --limit 4"
        lines={[
          'ID                                 KIND  PROVIDER  RISK   BLOCKED',
          'mcp:filesystem                     mcp   mcp       low    false',
          'mcp:postgres-observability         mcp   mcp       medium false',
          'mcp:remote-browser                 mcp   mcp       high   true',
          'Tip: npm run show -- --id mcp:filesystem'
        ]}
      />
    }
    right={
      <TerminalBlock
        command="npm run search -- security && npm run top -- --project . --limit 3"
        tone="info"
        lines={[
          'search results: skill:secure-prompting, copilot-extension:repo-security',
          'top picks for project:',
          '1) mcp:filesystem',
          '2) skill:secure-prompting',
          '3) copilot-extension:repo-security'
        ]}
      />
    }
    footer={['Works for empty and mature repos', 'Consistent IDs across commands', 'Fast iteration for platform teams']}
  />
);

const SceneRecommend: React.FC = () => (
  <SceneShell
    sceneNumber={6}
    title="5) Trust-First Recommendation Engine"
    subtitle="High-quality defaults with transparent scoring breakdown"
    kpis={['rankScore + breakdown', 'blocked + reason flags', 'Sort and filter controls', 'Safe-mode recommendations']}
    left={
      <TerminalBlock
        command="npm run dev -- recommend --project . --only-safe --sort trust --limit 5"
        tone="success"
        lines={[
          'ID                                   RANK  TRUST  FIT   RISK   BLOCKED',
          'mcp:filesystem                       51.7  41.8   72.0  low    false',
          'skill:secure-prompting               50.9  37.8   69.0  low    false',
          'copilot-extension:repo-security      50.6  38.6   63.0  low    false'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Score composition example"
        items={[
          'Base fit: compatibility + capability coverage.',
          'Trust core: provenance + maintenance + adoption.',
          'Security penalty: strongest weight, hard blocks for risky tiers.',
          'Freshness bonus: recently validated metadata scores higher.'
        ]}
        tone="success"
      />
    }
    footer={['Use --format json for automation', 'Use --kind and --provider for slicing', 'Use --only-safe in production']}
  />
);

const SceneExport: React.FC = () => (
  <SceneShell
    sceneNumber={7}
    title="6) Export and Governance Reporting"
    subtitle="Generate decision artifacts for docs, reviews, and policy audits"
    kpis={['CSV export', 'Markdown export', 'Deterministic columns', 'CI-friendly outputs']}
    left={
      <TerminalBlock
        command="npm run dev -- recommend --project . --export csv --out recommendations.csv"
        tone="success"
        lines={['Exported 5 recommendations to recommendations.csv', 'Columns: id, kind, provider, rank, trust, fit, risk, blocked']}
      />
    }
    right={
      <TerminalBlock
        command="npm run dev -- recommend --project . --export md --out recommendations.md"
        tone="info"
        lines={[
          'Exported 5 recommendations to recommendations.md',
          'Share in architecture docs and security sign-off reviews',
          'Stable output schema keeps diffs clean across runs'
        ]}
      />
    }
    footer={['Great for ADR attachments', 'No spreadsheet tooling needed', 'Output files are repo-friendly']}
  />
);

const SceneAssessInstall: React.FC = () => (
  <SceneShell
    sceneNumber={8}
    title="7) Risk Assessment + Install Gates"
    subtitle="Install flow enforces policy before any side effects"
    kpis={['Assessed risk tier', 'Block-by-default high risk', 'Explicit override support', 'Install audit trail']}
    left={
      <TerminalBlock
        command="npm run dev -- assess --id mcp:remote-browser"
        tone="warn"
        lines={[
          'id=mcp:remote-browser',
          'riskScore=59 riskTier=high blocked=true',
          'reasons: remote exec surface, low provenance confidence'
        ]}
      />
    }
    right={
      <TerminalBlock
        command="npm run dev -- install --id mcp:remote-browser --yes"
        tone="danger"
        lines={[
          'Install blocked by security policy.',
          'Use --override-risk only with explicit acceptance.',
          'Successful installs are written to data/security-reports/audits/'
        ]}
      />
    }
    footer={['Safer defaults for platform teams', 'Override is explicit and auditable', 'Ideal for enterprise change control']}
  />
);

const SceneSecurityOps: React.FC = () => (
  <SceneShell
    sceneNumber={9}
    title="8) Whitelist + Quarantine Operations"
    subtitle="Continuously contain risky catalog entries"
    kpis={['Whitelist verification', 'Quarantine application', 'Daily security workflow', 'Stale-source visibility']}
    left={
      <TerminalBlock
        command="npm run whitelist:verify"
        tone="warn"
        lines={[
          'reportPath: data/security-reports/YYYY-MM-DD/report.json',
          'passed: 9  failed: 1  staleRegistries: 0',
          'Non-whitelisted risky entries are candidates for quarantine'
        ]}
      />
    }
    right={
      <TerminalBlock
        command="npm run quarantine:apply -- --report data/security-reports/YYYY-MM-DD/report.json"
        tone="danger"
        lines={['Applied quarantine entries: 1', 'Catalog state updated to prevent accidental installation', 'Daily Security workflow can automate this path']}
      />
    }
    footer={['Security posture stays current', 'Automates recurring policy enforcement', 'Visible in CLI status and reports']}
  />
);

const SceneCI: React.FC = () => (
  <SceneShell
    sceneNumber={10}
    title="9) CI/CD Security and Validation Stack"
    subtitle="Hard gates on quality, dependency risk, secrets, and code scanning"
    kpis={['CI lint/test/build', 'CodeQL', 'Dependency Review', 'Secrets + Trivy + SBOM']}
    left={
      <TerminalBlock
        command="GitHub Actions required checks"
        tone="success"
        lines={[
          'CI / build',
          'Security / CodeQL',
          'Security / Dependency Review',
          'Security / Secrets',
          'Security / SBOM + Trivy'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Release confidence gains"
        items={[
          'Strict PR gates block risky changes before merge.',
          'Scheduled scans catch drift on main branch.',
          'Catalog sync and daily security maintain freshness.',
          'Badges in README expose operational trust signals.'
        ]}
        tone="success"
      />
    }
    footer={['Goal: minimum risk to publish', 'No hidden security debt', 'Trust is visible to users immediately']}
  />
);

const SceneOutro: React.FC = () => (
  <SceneShell
    sceneNumber={11}
    title="Framework Ready for Real Projects"
    subtitle="Discover, evaluate, and install with confidence at scale"
    kpis={['Simple onboarding', 'Rich CLI visualization', 'Trust-first ranking', 'Production security gates']}
    left={
      <TerminalBlock
        command="npm run top -- --project . --limit 3"
        tone="success"
        lines={[
          '1) mcp:filesystem',
          '2) skill:secure-prompting',
          '3) copilot-extension:repo-security',
          'Next: show -> assess -> install'
        ]}
      />
    }
    right={
      <BulletBlock
        title="Final operator flow"
        items={[
          'init once per repo',
          'doctor before high-impact operations',
          'sync daily and recommend safely',
          'assess/install with policy gates always on'
        ]}
        tone="info"
      />
    }
    footer={['Repository: github.com/amitrintzler/skills-and-mcps', 'Use README quick links for full command map', 'Built for speed + safety']}
  />
);

export const ExplainerVideo: React.FC = () => {
  const scenes: Array<React.FC> = [
    SceneIntro,
    SceneInit,
    SceneDoctor,
    SceneSync,
    SceneBrowse,
    SceneRecommend,
    SceneExport,
    SceneAssessInstall,
    SceneSecurityOps,
    SceneCI,
    SceneOutro
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      {scenes.map((Scene, index) => {
        const from = index * sceneDuration;
        return (
          <Sequence key={from} from={from} durationInFrames={sceneDuration}>
            <FadeScene duration={sceneDuration}>
              <Scene />
            </FadeScene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const walkthroughDurationInFrames = sceneDuration * sceneCount;
