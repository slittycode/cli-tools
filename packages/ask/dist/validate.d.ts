/**
 * Input validation for ask-cli.
 *
 * Each function either returns the (possibly normalised) valid value
 * or throws an AskError with an actionable message.
 * None of these functions have side effects.
 */
import type { AgentId } from './types.js';
/**
 * Validate the value passed to --agent.
 * Returns `{ id, model }` on success, throws AskError on failure.
 */
export declare function validateAgentFlag(raw: string): {
    id: AgentId;
    model?: string;
};
/**
 * Validate a fully assembled prompt string.
 * - Rejects empty / whitespace-only prompts
 * - Emits a stderr warning (but does NOT reject) if the prompt is very large
 *
 * Returns the prompt unchanged on success.
 */
export declare function validatePrompt(prompt: string): string;
/**
 * Validate a raw stdin chunk count against the hard size limit.
 * Call each time a 'data' event fires with the current cumulative byte count.
 * Throws AskError if the limit is exceeded.
 */
export declare function validateStdinSize(bytesSoFar: number): void;
/**
 * Validate the --system prompt value.
 * Returns the trimmed string on success, throws AskError if too long.
 */
export declare function validateSystemPrompt(raw: string): string;
/**
 * Validate an Ollama model name (the part after the colon in "ollama:model").
 * Model names must be alphanumeric + hyphens / dots / underscores / colons.
 * Returns the model name unchanged on success, throws AskError otherwise.
 */
export declare function validateModelName(model: string): string;
//# sourceMappingURL=validate.d.ts.map