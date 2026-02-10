import type { Registry } from '../lib/validation/contracts.js';
import { adaptClaudePluginsEntries } from './adapters/claude-plugins-v0.1.js';
import { adaptCopilotExtensionsEntries } from './adapters/copilot-extensions-v0.1.js';
import { adaptMcpRegistryEntries } from './adapters/mcp-registry-v0.1.js';
import { adaptOpenAiSkillsEntries } from './adapters/openai-skills-v1.js';

export function adaptRegistryEntries(registry: Registry, entries: unknown[]): unknown[] {
  if (registry.adapter === 'mcp-registry-v0.1') {
    return adaptMcpRegistryEntries(registry.id, entries);
  }

  if (registry.adapter === 'openai-skills-v1') {
    return adaptOpenAiSkillsEntries(registry.id, entries);
  }

  if (registry.adapter === 'claude-plugins-v0.1') {
    return adaptClaudePluginsEntries(registry.id, entries);
  }

  if (registry.adapter === 'copilot-extensions-v0.1') {
    return adaptCopilotExtensionsEntries(registry.id, entries);
  }

  return entries;
}
