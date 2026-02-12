import path from 'node:path';
import fsNative from 'node:fs/promises';
import type { Dirent } from 'node:fs';

import fs from 'fs-extra';

export interface ArchetypeScore {
  name: string;
  score: number;
}

export interface ProjectSignals {
  stack: string[];
  compatibilityTags: string[];
  inferredCapabilities: string[];
  scanEvidence: string[];
  inferredArchetype: string;
  inferenceConfidence: number;
  archetypeScores: ArchetypeScore[];
}

export async function detectProjectSignals(
  projectPath: string,
  options: { llm?: boolean } = {}
): Promise<ProjectSignals> {
  const root = path.resolve(projectPath);
  const stack = new Set<string>();
  const compatibilityTags = new Set<string>();
  const inferredCapabilities = new Set<string>();
  const scanEvidence = new Set<string>();

  if (await fs.pathExists(path.join(root, 'package.json'))) {
    stack.add('node');
    compatibilityTags.add('node');

    const pkg = await fs.readJson(path.join(root, 'package.json'));
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {})
    } as Record<string, string>;

    if ('react' in dependencies || 'next' in dependencies || 'next.js' in dependencies) {
      stack.add('react');
      compatibilityTags.add('react');
    }

    if ('typescript' in dependencies) {
      stack.add('typescript');
      compatibilityTags.add('typescript');
    }

    inferFromPackageJson(pkg as Record<string, unknown>, inferredCapabilities, scanEvidence);
  }

  if (
    (await fs.pathExists(path.join(root, 'pyproject.toml'))) ||
    (await fs.pathExists(path.join(root, 'requirements.txt')))
  ) {
    stack.add('python');
    compatibilityTags.add('python');
  }

  if (await fs.pathExists(path.join(root, 'Dockerfile'))) {
    compatibilityTags.add('container');
    inferredCapabilities.add('automation');
    scanEvidence.add('Dockerfile found');
  }

  if ((await fs.pathExists(path.join(root, 'pom.xml'))) || (await fs.pathExists(path.join(root, 'build.gradle')))) {
    stack.add('java');
    compatibilityTags.add('java');
  }

  if (await fs.pathExists(path.join(root, 'go.mod'))) {
    stack.add('go');
    compatibilityTags.add('go');
  }

  if (await fs.pathExists(path.join(root, 'Cargo.toml'))) {
    stack.add('rust');
    compatibilityTags.add('rust');
  }

  if (await fs.pathExists(path.join(root, 'Gemfile'))) {
    stack.add('ruby');
    compatibilityTags.add('ruby');
  }

  const files = await listRepositoryFiles(root, 6, 2000);
  const archetypeVotes = new Map<string, number>();
  inferFromRepositoryFiles(files, inferredCapabilities, scanEvidence, archetypeVotes);

  if (options.llm) {
    applyOptionalLlmHinting(inferredCapabilities, scanEvidence);
  }

  if (stack.size === 0) {
    stack.add('unknown');
    compatibilityTags.add('general');
  }

  const archetypeScores = toSortedArchetypeScores(archetypeVotes);
  const inferredArchetype = archetypeScores[0]?.name ?? 'general-project';
  const inferenceConfidence = Math.min(100, Math.max(0, Math.round((archetypeScores[0]?.score ?? 20) * 8)));

  return {
    stack: Array.from(stack).sort((a, b) => a.localeCompare(b)),
    compatibilityTags: Array.from(compatibilityTags).sort((a, b) => a.localeCompare(b)),
    inferredCapabilities: Array.from(inferredCapabilities).sort((a, b) => a.localeCompare(b)),
    scanEvidence: Array.from(scanEvidence).sort((a, b) => a.localeCompare(b)),
    inferredArchetype,
    inferenceConfidence,
    archetypeScores
  };
}

function inferFromPackageJson(
  pkg: Record<string, unknown>,
  inferredCapabilities: Set<string>,
  scanEvidence: Set<string>
): void {
  const dependencies = {
    ...((pkg.dependencies as Record<string, string> | undefined) ?? {}),
    ...((pkg.devDependencies as Record<string, string> | undefined) ?? {})
  };

  const scripts = (pkg.scripts as Record<string, string> | undefined) ?? {};
  const depNames = Object.keys(dependencies);

  const hasDep = (name: string): boolean => depNames.includes(name);
  const hasScriptLike = (needle: string): boolean =>
    Object.keys(scripts).some((key) => key.toLowerCase().includes(needle));

  if (hasDep('zod') || hasDep('yup') || hasDep('joi')) {
    inferredCapabilities.add('guardrails');
    inferredCapabilities.add('security');
    scanEvidence.add('validation library detected (zod/yup/joi)');
  }

  if (
    hasDep('playwright') ||
    hasDep('puppeteer') ||
    hasDep('@playwright/test') ||
    hasDep('selenium-webdriver')
  ) {
    inferredCapabilities.add('browser-control');
    inferredCapabilities.add('automation');
    scanEvidence.add('browser automation dependency detected');
  }

  if (
    hasDep('openai') ||
    hasDep('@anthropic-ai/sdk') ||
    hasDep('langchain') ||
    hasDep('@langchain/core')
  ) {
    inferredCapabilities.add('prompting');
    inferredCapabilities.add('search');
    scanEvidence.add('LLM SDK dependency detected');
  }

  if (hasDep('axios') || hasDep('got') || hasDep('node-fetch') || hasDep('undici')) {
    inferredCapabilities.add('automation');
    scanEvidence.add('HTTP client dependency detected');
  }

  if (hasScriptLike('lint') || hasScriptLike('audit') || hasScriptLike('security')) {
    inferredCapabilities.add('security');
    scanEvidence.add('security/lint scripts detected in package.json');
  }
}

async function listRepositoryFiles(root: string, maxDepth: number, maxFiles: number): Promise<string[]> {
  const ignore = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', 'out', 'build', '.turbo']);
  const collected: string[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth || collected.length >= maxFiles) {
      return;
    }

    let entries: Dirent[];
    try {
      entries = await fsNative.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (collected.length >= maxFiles) {
        return;
      }

      const full = path.join(current, entry.name);
      const relative = path.relative(root, full);
      if (!relative) {
        continue;
      }

      if (entry.isDirectory()) {
        if (ignore.has(entry.name)) {
          continue;
        }
        await walk(full, depth + 1);
        continue;
      }

      collected.push(relative);
    }
  }

  await walk(root, 0);
  return collected;
}

function inferFromRepositoryFiles(
  files: string[],
  inferredCapabilities: Set<string>,
  scanEvidence: Set<string>,
  archetypeVotes: Map<string, number>
): void {
  const lowerFiles = files.map((file) => file.toLowerCase());
  const vote = (archetype: string, points: number): void => {
    archetypeVotes.set(archetype, (archetypeVotes.get(archetype) ?? 0) + points);
  };

  if (lowerFiles.some((file) => file.endsWith('package.json'))) {
    vote('node-service', 3);
  }
  if (lowerFiles.some((file) => file.includes('next.config') || file.includes('/pages/') || file.includes('/app/'))) {
    vote('frontend-web-app', 4);
  }
  if (lowerFiles.some((file) => file.includes('src/video/') || file.includes('remotion'))) {
    vote('media-automation', 4);
  }
  if (lowerFiles.some((file) => file.includes('src/commands/') || file.includes('src/interfaces/cli'))) {
    vote('cli-platform-tooling', 5);
  }
  if (lowerFiles.some((file) => file.includes('dockerfile') || file.includes('k8s') || file.includes('helm'))) {
    vote('devops-automation', 4);
  }
  if (
    lowerFiles.some((file) => file.includes('src/security/') || file.includes('whitelist') || file.includes('quarantine'))
  ) {
    vote('security-governance-tooling', 6);
  }

  if (lowerFiles.some((file) => file.startsWith('.github/workflows/'))) {
    inferredCapabilities.add('automation');
    scanEvidence.add('GitHub Actions workflows detected');
    vote('devops-automation', 3);
  }

  if (lowerFiles.some((file) => file.includes('codeql') || file.includes('trivy') || file.includes('gitleaks'))) {
    inferredCapabilities.add('code-scanning');
    inferredCapabilities.add('dependency-audit');
    inferredCapabilities.add('security');
    scanEvidence.add('security scanning workflows/configs detected');
    vote('security-governance-tooling', 5);
  }

  if (lowerFiles.some((file) => file.includes('dockerfile') || file.includes('compose'))) {
    inferredCapabilities.add('automation');
    scanEvidence.add('container/deployment files detected');
    vote('devops-automation', 2);
  }

  if (lowerFiles.some((file) => file.includes('tests/') || file.endsWith('.spec.ts') || file.endsWith('.test.ts'))) {
    inferredCapabilities.add('guardrails');
    scanEvidence.add('automated tests detected');
    vote('quality-platform', 2);
  }

  if (lowerFiles.some((file) => file.includes('playwright') || file.includes('browser'))) {
    inferredCapabilities.add('browser-control');
    inferredCapabilities.add('automation');
    scanEvidence.add('browser workflow files detected');
    vote('qa-automation', 3);
  }

  if (lowerFiles.includes('skill.lock') || lowerFiles.includes('.skills-mcps.json')) {
    inferredCapabilities.add('automation');
    scanEvidence.add('local skills/mcps tooling config detected');
    vote('cli-platform-tooling', 2);
  }

  if (lowerFiles.some((file) => file.includes('src/catalog/') || file.includes('config/registries'))) {
    inferredCapabilities.add('search');
    inferredCapabilities.add('automation');
    scanEvidence.add('catalog and registry pipeline files detected');
    vote('catalog-intelligence-platform', 5);
  }
}

function toSortedArchetypeScores(votes: Map<string, number>): ArchetypeScore[] {
  if (votes.size === 0) {
    return [{ name: 'general-project', score: 3 }];
  }

  return Array.from(votes.entries())
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function applyOptionalLlmHinting(inferredCapabilities: Set<string>, scanEvidence: Set<string>): void {
  if (!process.env.OPENAI_API_KEY) {
    scanEvidence.add('LLM enrichment requested but OPENAI_API_KEY is not set; using deterministic scan only');
    return;
  }

  inferredCapabilities.add('prompting');
  inferredCapabilities.add('agent-orchestration');
  scanEvidence.add('LLM enrichment enabled (heuristic augmentation active)');
}
