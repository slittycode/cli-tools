/**
 * Agent router — resolves which agent(s) to use for a given ask invocation.
 *
 * Default preference order: claude-cli → bedrock → gemini → ollama
 * Override with --agent <id> or --agent <id>:<model>
 */

import { AgentId, AgentInfo } from './types.js';
import { detectAgents, availableAgents } from './detect.js';
import { createAgent } from './agents/index.js';
import type { Agent } from './types.js';

const PREFERENCE_ORDER: AgentId[] = ['claude-cli', 'bedrock', 'openai', 'gemini', 'ollama'];

/**
 * Parse "--agent" value into id + optional model.
 * Examples:
 *   "ollama"           → { id: 'ollama', model: undefined }
 *   "ollama:qwen2.5"   → { id: 'ollama', model: 'qwen2.5' }
 */
export function parseAgentFlag(flag: string): { id: AgentId; model?: string } {
  const [id, model] = flag.split(':') as [AgentId, string | undefined];
  return { id, model };
}

/**
 * Resolve to a single agent (for normal invocation).
 * If --agent is specified, validate and return that agent.
 * Otherwise return the first available agent in preference order.
 */
export async function resolveAgent(agentFlag?: string): Promise<Agent> {
  const all = await detectAgents();

  if (agentFlag) {
    const { id, model } = parseAgentFlag(agentFlag);
    const info = all.find((a) => a.id === id);

    if (!info) {
      const valid = PREFERENCE_ORDER.join(', ');
      throw new Error(`Unknown agent "${id}". Valid agents: ${valid}`);
    }
    if (!info.available) {
      throw new Error(`Agent "${id}" is not available: ${info.reason}`);
    }
    return createAgent(info, model);
  }

  // Auto-select by preference
  const available = all.filter((a) => a.available && a.id !== 'cline');
  const ordered = PREFERENCE_ORDER
    .map((id) => available.find((a) => a.id === id))
    .filter((a): a is AgentInfo => a !== undefined);

  if (ordered.length === 0) {
    throw new Error(
      'No AI agents available.\n' +
        'Install one of:\n' +
        '  • Claude Code CLI: https://claude.ai/code\n' +
        '  • AWS Bedrock: set AWS_PROFILE or AWS_ACCESS_KEY_ID\n' +
        '  • OpenAI: set OPENAI_API_KEY (https://platform.openai.com/api-keys)\n' +
        '  • Gemini: set GOOGLE_API_KEY or install gemini CLI\n' +
        '  • Ollama: run `ollama serve` and pull a model'
    );
  }

  return createAgent(ordered[0]);
}

/**
 * Resolve all available agents (for --all mode).
 */
export async function resolveAllAgents(): Promise<Agent[]> {
  const infos = await availableAgents();
  const ordered = PREFERENCE_ORDER
    .map((id) => infos.find((a) => a.id === id))
    .filter((a): a is AgentInfo => a !== undefined);
  return ordered.map((info) => createAgent(info));
}
