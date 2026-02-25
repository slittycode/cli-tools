/**
 * Centralised error types and sanitisation for ask-cli.
 *
 * Security note: API keys and credentials must never appear in terminal output
 * or error messages. All errors that may contain external data (API responses,
 * subprocess stderr) are run through sanitizeForDisplay() before surfacing.
 */
export declare const ErrorCode: {
    /** --agent flag value is malformed */
    readonly INVALID_AGENT_FLAG: "INVALID_AGENT_FLAG";
    /** Named agent is not in the known-agent list */
    readonly UNKNOWN_AGENT: "UNKNOWN_AGENT";
    /** Named agent exists but is not currently available */
    readonly AGENT_UNAVAILABLE: "AGENT_UNAVAILABLE";
    /** No agents are configured/reachable */
    readonly NO_AGENTS: "NO_AGENTS";
    /** Prompt or stdin is empty after trimming */
    readonly EMPTY_PROMPT: "EMPTY_PROMPT";
    /** Stdin exceeded the hard size limit */
    readonly STDIN_TOO_LARGE: "STDIN_TOO_LARGE";
    /** Stdin read timed out */
    readonly STDIN_TIMEOUT: "STDIN_TIMEOUT";
    /** --system value exceeds the allowed length */
    readonly SYSTEM_TOO_LONG: "SYSTEM_TOO_LONG";
    /** An agent's API or subprocess returned an error */
    readonly AGENT_ERROR: "AGENT_ERROR";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export declare class AskError extends Error {
    readonly code: ErrorCode;
    constructor(code: ErrorCode, message: string);
}
/**
 * Replace any credential-like substring with `[REDACTED]`.
 * Apply to all externally-sourced strings before displaying them.
 */
export declare function sanitizeForDisplay(input: string): string;
/**
 * Wrap an unknown caught value into a sanitized AskError.
 * Used in agent adapters so raw API error bodies can't leak credentials.
 */
export declare function wrapAgentError(agentName: string, err: unknown): AskError;
//# sourceMappingURL=errors.d.ts.map