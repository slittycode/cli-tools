/**
 * Centralised configuration constants for ask-cli.
 * All magic numbers live here — override where needed via env vars.
 */
// ── Prompt / input limits ────────────────────────────────────────────────────
/** Maximum bytes accepted from stdin before we hard-abort (10 MB) */
export const MAX_STDIN_BYTES = 10_000_000;
/** Soft warning threshold for total prompt size (100 KB) */
export const MAX_PROMPT_BYTES = 100_000;
/** Maximum characters for a --system prompt (10 KB) */
export const MAX_SYSTEM_CHARS = 10_000;
/** Maximum characters for the --agent flag value (64 chars is plenty) */
export const MAX_AGENT_FLAG_CHARS = 64;
// ── Timeouts (ms) ────────────────────────────────────────────────────────────
/** How long to wait for stdin to finish sending data */
export const STDIN_TIMEOUT_MS = 30_000;
/** How long `ctx generate` may run before we skip it */
export const CTX_TIMEOUT_MS = 5_000;
/** HTTP probe timeout for Ollama availability check */
export const OLLAMA_PROBE_TIMEOUT_MS = 1_500;
/** Maximum tokens to request from each agent */
export const MAX_OUTPUT_TOKENS = 4_096;
// ── Agent defaults ───────────────────────────────────────────────────────────
export const DEFAULT_BEDROCK_MODEL = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
export const DEFAULT_BEDROCK_REGION = 'us-east-1';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o';
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5';
// ── API endpoints ────────────────────────────────────────────────────────────
export const OPENAI_API_BASE = 'https://api.openai.com/v1';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const OLLAMA_API_BASE = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
// ── Renderer ─────────────────────────────────────────────────────────────────
/** Width of decorative rules in the terminal output */
export const RULE_WIDTH = 60;
//# sourceMappingURL=config.js.map