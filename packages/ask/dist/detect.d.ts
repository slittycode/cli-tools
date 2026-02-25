/**
 * Agent auto-detection
 * Probes the environment for available AI agents without side effects.
 */
import { AgentInfo, AgentId } from './types.js';
/**
 * Detect all agents and return their availability info.
 * This is the authoritative probe — run once at startup.
 */
export declare function detectAgents(): Promise<AgentInfo[]>;
/** Convenience: return only available agents (excluding VS Code-only ones) */
export declare function availableAgents(): Promise<AgentInfo[]>;
/** Look up a single agent by id */
export declare function getAgentInfo(id: AgentId): Promise<AgentInfo | undefined>;
//# sourceMappingURL=detect.d.ts.map