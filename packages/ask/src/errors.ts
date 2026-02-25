/**
 * Centralised error types and sanitisation for ask-cli.
 *
 * Security note: API keys and credentials must never appear in terminal output
 * or error messages. All errors that may contain external data (API responses,
 * subprocess stderr) are run through sanitizeForDisplay() before surfacing.
 */

// ── Error codes ───────────────────────────────────────────────────────────────

export const ErrorCode = {
  /** --agent flag value is malformed */
  INVALID_AGENT_FLAG: 'INVALID_AGENT_FLAG',
  /** Named agent is not in the known-agent list */
  UNKNOWN_AGENT: 'UNKNOWN_AGENT',
  /** Named agent exists but is not currently available */
  AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',
  /** No agents are configured/reachable */
  NO_AGENTS: 'NO_AGENTS',
  /** Prompt or stdin is empty after trimming */
  EMPTY_PROMPT: 'EMPTY_PROMPT',
  /** Stdin exceeded the hard size limit */
  STDIN_TOO_LARGE: 'STDIN_TOO_LARGE',
  /** Stdin read timed out */
  STDIN_TIMEOUT: 'STDIN_TIMEOUT',
  /** --system value exceeds the allowed length */
  SYSTEM_TOO_LONG: 'SYSTEM_TOO_LONG',
  /** An agent's API or subprocess returned an error */
  AGENT_ERROR: 'AGENT_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── AskError ──────────────────────────────────────────────────────────────────

export class AskError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AskError';
    this.code = code;
  }
}

// ── Sanitisation ─────────────────────────────────────────────────────────────

/**
 * Patterns that look like credentials.  We replace full matches with a
 * redacted placeholder so keys can never leak into terminal output, logs,
 * or bug reports.
 *
 * Patterns covered:
 *   - OpenAI:  sk-[48+ chars]  or  sk-proj-[48+ chars]
 *   - AWS access key: AKIA[16 uppercase alphanums]
 *   - Google:  AIza[35 base64url chars]
 *   - Generic bearer tokens passed via Authorization headers (≥ 20 chars)
 */
const CREDENTIAL_PATTERNS: RegExp[] = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /AIza[A-Za-z0-9_\-]{35}/g,
  /(?<=Bearer\s)[A-Za-z0-9_\-\.]{20,}/g,
];

/**
 * Replace any credential-like substring with `[REDACTED]`.
 * Apply to all externally-sourced strings before displaying them.
 */
export function sanitizeForDisplay(input: string): string {
  let out = input;
  for (const pattern of CREDENTIAL_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

/**
 * Wrap an unknown caught value into a sanitized AskError.
 * Used in agent adapters so raw API error bodies can't leak credentials.
 */
export function wrapAgentError(agentName: string, err: unknown): AskError {
  const raw = err instanceof Error ? err.message : String(err);
  const safe = sanitizeForDisplay(raw);
  return new AskError(ErrorCode.AGENT_ERROR, `${agentName} failed: ${safe}`);
}
