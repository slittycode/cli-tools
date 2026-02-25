/**
 * Agent router — resolves which agent(s) to use for a given ask invocation.
 *
 * Default preference order: claude-cli → bedrock → gemini → ollama
 * Override with --agent <id> or --agent <id>:<model>
 */

import { AgentId, AgentInfo } from './types.js';
import { detectAgents, availableAgents } from './detect.js';
import { createAgent } from './agents/index.js';
import { validateAgentFlag } from './validate.js';
import { AskError, ErrorCode } from './errors.js';
import type { Agent } from './types.js';

const PREFERENCE_ORDER: AgentId[] = ['claude-cli', 'bedrock', 'openai', 'gemini', 'ollama'];

/** @deprecated Use validateAgentFlag from validate.ts directly.
 * Kept for backwards compatibility with external callers.
 */
export function parseAgentFlag(flag: string): { id: AgentId; model?: string } {
  return validateAgentFlag(flag);
}

/**
 * Resolve to a single agent (for normal invocation).
 * If --agent is specified, validate and return that agent.
 * Otherwise return the first available agent in preference order.
 */
export async function resolveAgent(agentFlag?: string): Promise<Agent> {
  const all = await detectAgents();

  if (agentFlag) {
    // validateAgentFlag throws AskError on bad format / unknown id
    const { id, model } = validateAgentFlag(agentFlag);
    const info = all.find((a) => a.id === id);

    // info will always exist here because validateAgentFlag checks VALID_AGENT_IDS
    if (!info || !info.available) {
      throw new AskError(
        ErrorCode.AGENT_UNAVAILABLE,
        `Agent "${id}" is not available: ${info?.reason ?? 'unknown reason'}`
      );
    }
    return createAgent(info, model);
  }

  // Auto-select by preference
  const available = all.filter((a) => a.available && a.id !== 'cline');
  const ordered = PREFERENCE_ORDER
    .map((id) => available.find((a) => a.id === id))
    .filter((a): a is AgentInfo => a !== undefined);

  if (ordered.length === 0) {
    throw new AskError(
      ErrorCode.NO_AGENTS,
      'No AI agents available.\n' +
        'Configure one of:\n' +
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
