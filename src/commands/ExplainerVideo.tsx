import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const palette = {
  bg: '#0b1220',
  panel: '#111827',
  panelBorder: '#334155',
  text: '#e5e7eb',
  muted: '#94a3b8',
  accent: '#22d3ee',
  success: '#22c55e',
  warn: '#f59e0b',
  danger: '#ef4444'
};

const sceneDuration = 300;

const FadeScene: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const local = useCurrentFrame();
  const fade = Math.min(24, Math.floor(duration * 0.1));
  const opacity = interpolate(local, [0, fade, duration - fade, duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const TitleBlock: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 16 } });

  return (
    <div style={{ textAlign: 'center', transform: `translateY(${(1 - rise) * 20}px)` }}>
      <h1 style={{ fontSize: 68, margin: 0, color: palette.text }}>{title}</h1>
      <p style={{ fontSize: 28, marginTop: 18, color: palette.accent }}>{subtitle}</p>
    </div>
  );
};

const TerminalCard: React.FC<{ command: string; lines: string[]; tone?: 'normal' | 'success' | 'warn' | 'danger' }> = ({
  command,
  lines,
  tone = 'normal'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 18 } });
  const toneColor = tone === 'success' ? palette.success : tone === 'warn' ? palette.warn : tone === 'danger' ? palette.danger : palette.muted;

  return (
    <div
      style={{
        width: '86%',
        maxWidth: 1320,
        backgroundColor: palette.panel,
        border: `2px solid ${palette.panelBorder}`,
        borderRadius: 16,
        padding: 26,
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        transform: `scale(${0.96 + appear * 0.04})`
      }}
    >
      <div style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace', color: palette.accent, fontSize: 28 }}>$ {command}</div>
      <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        {lines.map((line, index) => (
          <div
            key={line}
            style={{
              fontFamily: 'Menlo, Monaco, Consolas, monospace',
              color: index === lines.length - 1 ? toneColor : palette.text,
              fontSize: 22,
              whiteSpace: 'pre-wrap'
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: palette.bg,
      color: palette.text,
      fontFamily: 'ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
      padding: '56px 72px',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}
  >
    {children}
  </AbsoluteFill>
);

const SceneIntro: React.FC = () => (
  <Layout>
    <TitleBlock
      title="Complete Framework Walkthrough"
      subtitle="From first run to secure install, quarantine automation, and CI trust"
    />
    <TerminalCard
      command="npm run about"
      lines={[
        'skills-and-mcps v0.1.0',
        'Scope: skills, MCP servers, Claude plugins, Copilot extensions',
        'Ranking: trust-first, security-gated'
      ]}
    />
  </Layout>
);

const SceneInit: React.FC = () => (
  <Layout>
    <TitleBlock title="1) First-Run Wizard" subtitle="Interactive setup for any project" />
    <TerminalCard
      command="npm run init"
      lines={[
        'Default kinds [skill,mcp,copilot-extension]:',
        'Default providers [anthropic,github,mcp,openai]:',
        'Risk posture [balanced|strict]: strict',
        'Initialized local CLI config: .skills-mcps.json'
      ]}
      tone="success"
    />
  </Layout>
);

const SceneDoctor: React.FC = () => (
  <Layout>
    <TitleBlock title="2) Environment Diagnostics" subtitle="Run doctor before operational workflows" />
    <TerminalCard
      command="npm run doctor"
      lines={[
        'gh                 pass   gh available',
        'Node version       pass   Node 22.x',
        'skill.sh           warn   not found',
        'Catalog            pass   loaded',
        'Sync freshness     pass   no stale registries'
      ]}
      tone="warn"
    />
  </Layout>
);

const SceneSync: React.FC = () => (
  <Layout>
    <TitleBlock title="3) Catalog Sync" subtitle="Dry-run preview then full sync" />
    <TerminalCard
      command="npm run dev -- sync --dry-run"
      lines={[
        'community-skills-index (skill) entries=2 remote=yes',
        'public-mcp-directory (mcp) entries=2 remote=yes',
        'official-claude-plugins (claude-plugin) entries=1 remote=yes',
        'official-copilot-extensions (copilot-extension) entries=1 remote=yes'
      ]}
    />
  </Layout>
);

const SceneBrowse: React.FC = () => (
  <Layout>
    <TitleBlock title="4) Browse + Search + Inspect" subtitle="Discover quickly, inspect deeply" />
    <TerminalCard
      command="npm run list -- --kind mcp --limit 3"
      lines={[
        'mcp:filesystem       mcp   mcp   low(10)   false',
        'mcp:remote-browser   mcp   mcp   high(59)  true',
        'Use show --id <catalog-id> for full detail'
      ]}
    />
  </Layout>
);

const SceneRecommend: React.FC = () => (
  <Layout>
    <TitleBlock title="5) Rich Recommendations" subtitle="Sorted, filtered, and safe-first by default" />
    <TerminalCard
      command="npm run dev -- recommend --project . --only-safe --sort trust --limit 5"
      lines={[
        'mcp:filesystem                  rank 51.7  trust 41.8  low(10)  false',
        'skill:secure-prompting          rank 50.9  trust 37.8  low(0)   false',
        'copilot-extension:repo-security rank 50.6  trust 38.6  low(0)   false'
      ]}
      tone="success"
    />
  </Layout>
);

const SceneExport: React.FC = () => (
  <Layout>
    <TitleBlock title="6) Export and Share" subtitle="CSV/Markdown output for docs and governance" />
    <TerminalCard
      command="npm run dev -- recommend --project . --export csv --out recommendations.csv"
      lines={[
        'Exported 5 recommendations to recommendations.csv',
        'Also available: --export md --out recommendations.md'
      ]}
      tone="success"
    />
  </Layout>
);

const SceneAssessInstall: React.FC = () => (
  <Layout>
    <TitleBlock title="7) Risk Assessment and Install Gates" subtitle="Block-by-default for high risk" />
    <TerminalCard
      command="npm run dev -- install --id mcp:remote-browser --yes"
      lines={[
        'Blocked by security policy (high, score=59)',
        'Use --override-risk for explicit acceptance'
      ]}
      tone="danger"
    />
  </Layout>
);

const SceneSecurityOps: React.FC = () => (
  <Layout>
    <TitleBlock title="8) Ongoing Security Operations" subtitle="Whitelist verify + quarantine automation" />
    <TerminalCard
      command="npm run whitelist:verify"
      lines={[
        'reportPath: data/security-reports/YYYY-MM-DD/report.json',
        'failed: 1',
        'npm run quarantine:apply -- --report <reportPath>'
      ]}
      tone="warn"
    />
  </Layout>
);

const SceneCI: React.FC = () => (
  <Layout>
    <TitleBlock title="9) CI and Compliance" subtitle="CodeQL, dependency review, secrets, Trivy, SBOM" />
    <TerminalCard
      command="GitHub Actions"
      lines={[
        'CI (Node 18/20) + policy verification',
        'Security / CodeQL',
        'Security / Dependency Review',
        'Security / Secrets (gitleaks)',
        'Security / SBOM + Trivy'
      ]}
      tone="success"
    />
  </Layout>
);

const SceneOutro: React.FC = () => (
  <Layout>
    <TitleBlock title="Framework Ready for Any Project" subtitle="Simple onboarding, rich CLI UX, minimal risk operations" />
    <TerminalCard
      command="npm run top -- --limit 3"
      lines={[
        'Run top picks, inspect details, then install safely.',
        'Repository: github.com/amitrintzler/skills-and-mcps'
      ]}
      tone="success"
    />
  </Layout>
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

export const walkthroughDurationInFrames = sceneDuration * 11;
