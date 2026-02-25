/**
 * Terminal output renderer
 * Handles agent headers, streaming output, and the status display.
 */
import { AgentInfo } from './types.js';
/** Print the agent header when streaming begins */
export declare function printAgentHeader(info: AgentInfo): void;
/** Print a separator between --all responses */
export declare function printDivider(): void;
/** Stream a chunk to stdout (no newline appended) */
export declare function writeChunk(chunk: string): void;
/** Print a newline after streaming completes */
export declare function printStreamEnd(): void;
/** Print an error for a specific agent */
export declare function printAgentError(info: AgentInfo, err: unknown): void;
/** Print the status table */
export declare function printStatus(agents: AgentInfo[]): void;
/** Print a brief "routing to" notice before streaming (single-agent mode) */
export declare function printRouting(info: AgentInfo): void;
/** Print usage hint when no prompt and no stdin */
export declare function printNoPrompt(): void;
//# sourceMappingURL=renderer.d.ts.map