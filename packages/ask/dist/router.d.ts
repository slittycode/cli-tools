/**
 * Agent router — resolves which agent(s) to use for a given ask invocation.
 *
 * Default preference order: claude-cli → bedrock → gemini → ollama
 * Override with --agent <id> or --agent <id>:<model>
 */
import { AgentId } from './types.js';
import type { Agent } from './types.js';
/**
 * Parse "--agent" value into id + optional model.
 * Examples:
 *   "ollama"           → { id: 'ollama', model: undefined }
 *   "ollama:qwen2.5"   → { id: 'ollama', model: 'qwen2.5' }
 */
export declare function parseAgentFlag(flag: string): {
    id: AgentId;
    model?: string;
};
/**
 * Resolve to a single agent (for normal invocation).
 * If --agent is specified, validate and return that agent.
 * Otherwise return the first available agent in preference order.
 */
export declare function resolveAgent(agentFlag?: string): Promise<Agent>;
/**
 * Resolve all available agents (for --all mode).
 */
export declare function resolveAllAgents(): Promise<Agent[]>;
//# sourceMappingURL=router.d.ts.map