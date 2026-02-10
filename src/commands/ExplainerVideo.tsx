import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, useVideoConfig, spring } from 'remotion';

// --- Styles & Components ---

const colors = {
  bg: '#0f172a', // Slate 900
  text: '#f8fafc', // Slate 50
  accent: '#38bdf8', // Sky 400
  danger: '#ef4444', // Red 500
  success: '#22c55e', // Green 500
  terminalBg: '#1e293b', // Slate 800
  terminalHeader: '#334155', // Slate 700
};

const fontStyle: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: colors.text,
  fontWeight: 'bold',
};

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, ...fontStyle }}>
    {children}
  </AbsoluteFill>
);

const Title: React.FC<{ text: string; subText?: string; color?: string }> = ({ text, subText, color = colors.text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, 20], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ textAlign: 'center', opacity, transform: `translateY(${translateY}px)` }}>
      <h1 style={{ fontSize: 80, margin: 0, color }}>{text}</h1>
      {subText && <h2 style={{ fontSize: 40, marginTop: 20, color: colors.accent, opacity: 0.8 }}>{subText}</h2>}
    </div>
  );
};

const TerminalWindow: React.FC<{ command: string; output?: React.ReactNode; delay?: number }> = ({ command, output, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Typing effect
  const startFrame = delay;
  const charsToShow = Math.floor(interpolate(frame - startFrame, [0, 40], [0, command.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  
  // Output visibility
  const showOutput = frame > startFrame + 45;
  const outputOpacity = interpolate(frame - (startFrame + 45), [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '80%',
      maxWidth: 1000,
      backgroundColor: colors.terminalBg,
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      fontFamily: 'monospace',
      fontSize: 32,
      textAlign: 'left'
    }}>
      <div style={{ height: 40, backgroundColor: colors.terminalHeader, display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f56', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffbd2e', marginRight: 8 }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#27c93f' }} />
      </div>
      <div style={{ padding: 40, minHeight: 300 }}>
        <div style={{ color: colors.accent, marginBottom: 20 }}>
          <span style={{ color: colors.success }}>➜</span> ~ {command.slice(0, charsToShow)}{cursorVisible ? '▋' : ''}
        </div>
        {showOutput && (
          <div style={{ opacity: outputOpacity, whiteSpace: 'pre-wrap', color: '#cbd5e1', fontSize: 24 }}>
            {output}
          </div>
        )}
      </div>
    </div>
  );
};

const TransitionWrapper: React.FC<{ children: React.ReactNode; duration: number }> = ({ children, duration }) => {
  const frame = useCurrentFrame();
  const transitionDuration = 15;

  const opacity = interpolate(
    frame,
    [0, transitionDuration, duration - transitionDuration, duration],
    [0, 1, 1, 0]
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// --- Scenes ---

const Scene1_Problem: React.FC = () => {
  return (
    <Center>
      <Title text="The Problem" color={colors.danger} />
      <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
        <div style={{ padding: 30, border: `2px solid ${colors.terminalHeader}`, borderRadius: 10 }}>
          Scattered Registries?
        </div>
        <div style={{ padding: 30, border: `2px solid ${colors.terminalHeader}`, borderRadius: 10 }}>
          Unverified Code?
        </div>
        <div style={{ padding: 30, border: `2px solid ${colors.terminalHeader}`, borderRadius: 10 }}>
          Security Risks?
        </div>
      </div>
    </Center>
  );
};

const Scene2_Solution: React.FC = () => {
  return (
    <Center>
      <Title text="One Intelligence Hub" subText="Skills + MCP + Claude Plugins" />
      <div style={{ marginTop: 60 }}>
        <TerminalWindow 
          command="npm run sync" 
          output="✓ Synced 120 skills from 3 registries"
        />
      </div>
    </Center>
  );
};

const Scene3_Recommendations: React.FC = () => {
  const output = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #475569', paddingBottom: 10 }}>
        <span>NAME</span><span>SCORE</span><span>REASON</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.success }}>
        <span>mcp:filesystem</span><span>98</span><span>Required by package.json</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.text }}>
        <span>skill:react-gen</span><span>85</span><span>React project detected</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
        <span>mcp:postgres</span><span>40</span><span>Low relevance</span>
      </div>
    </div>
  );

  return (
    <Center>
      <div style={{ position: 'absolute', top: 100 }}>
        <Title text="Context-Aware" subText="Recommendations based on YOUR project" />
      </div>
      <div style={{ marginTop: 100 }}>
        <TerminalWindow 
          command="npm run dev -- recommend --project ." 
          output={output}
        />
      </div>
    </Center>
  );
};

const Scene4_Security: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, config: { damping: 10 } });

  return (
    <Center>
      <Title text="Security First" subText="Active Risk Scoring" />
      <div style={{ 
        marginTop: 60, 
        padding: 60, 
        backgroundColor: '#450a0a', 
        border: `4px solid ${colors.danger}`, 
        borderRadius: 20,
        transform: `scale(${scale})`
      }}>
        <h2 style={{ color: colors.danger, fontSize: 60, margin: 0 }}>BLOCKED</h2>
        <p style={{ fontSize: 30, margin: '20px 0' }}>Risk Score: 85 (Critical)</p>
        <ul style={{ textAlign: 'left', fontSize: 24, color: '#fca5a5' }}>
          <li>⚠ Unverified Author</li>
          <li>⚠ Suspicious Network Patterns</li>
        </ul>
      </div>
    </Center>
  );
};

const Scene5_Trust: React.FC = () => {
  return (
    <Center>
      <Title text="Continuous Trust" subText="Daily CI & Auto-Quarantine" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 60, width: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30 }}>
          <span style={{ color: colors.success }}>✓</span> Sync Catalog
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30 }}>
          <span style={{ color: colors.success }}>✓</span> Verify Whitelist
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30 }}>
          <span style={{ color: colors.success }}>✓</span> Check Vulnerability DB
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 30, opacity: 0.5 }}>
          <span>...</span> Generating Report
        </div>
      </div>
    </Center>
  );
};

const Scene6_CTA: React.FC = () => {
  return (
    <Center>
      <Title text="Start Today" color={colors.accent} />
      <div style={{ marginTop: 60 }}>
        <TerminalWindow 
          command="npm run sync" 
          output={
            <div style={{ color: colors.success, marginTop: 20 }}>
              Ready to install safely.
            </div>
          }
        />
      </div>
      <h3 style={{ marginTop: 60, fontSize: 24, color: '#94a3b8' }}>github.com/amitri/skills-and-mcps</h3>
    </Center>
  );
};

// --- Main Composition ---

export const ExplainerVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* 1. Problem (0-12s) */}
      <Sequence from={0} durationInFrames={360}>
        <TransitionWrapper duration={360}>
          <Scene1_Problem />
        </TransitionWrapper>
      </Sequence>

      {/* 2. Solution (12-28s) -> Starts at 360 */}
      <Sequence from={360} durationInFrames={480}>
        <TransitionWrapper duration={480}>
          <Scene2_Solution />
        </TransitionWrapper>
      </Sequence>

      {/* 3. Key Benefit 1: Recommendations (28-45s) -> Starts at 840 */}
      <Sequence from={840} durationInFrames={510}>
        <TransitionWrapper duration={510}>
          <Scene3_Recommendations />
        </TransitionWrapper>
      </Sequence>

      {/* 4. Key Benefit 2: Security (45-62s) -> Starts at 1350 */}
      <Sequence from={1350} durationInFrames={510}>
        <TransitionWrapper duration={510}>
          <Scene4_Security />
        </TransitionWrapper>
      </Sequence>

      {/* 5. Key Benefit 3: Trust (62-78s) -> Starts at 1860 */}
      <Sequence from={1860} durationInFrames={480}>
        <TransitionWrapper duration={480}>
          <Scene5_Trust />
        </TransitionWrapper>
      </Sequence>

      {/* 6. Outcome / CTA (78-90s) -> Starts at 2340 */}
      <Sequence from={2340} durationInFrames={360}>
        <TransitionWrapper duration={360}>
          <Scene6_CTA />
        </TransitionWrapper>
      </Sequence>
      
      {/* Background Audio (Optional placeholder) */}
      {/* <Audio src={staticFile("background-music.mp3")} /> */}
    </AbsoluteFill>
  );
};

// --- Remotion Root (Optional, if you need to register it here) ---
// In a standard Remotion project, this would be in src/Root.tsx
/*
import { Composition } from 'remotion';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
*/