/**
 * Centralised configuration constants for ask-cli.
 * All magic numbers live here — override where needed via env vars.
 */
/** Maximum bytes accepted from stdin before we hard-abort (10 MB) */
export declare const MAX_STDIN_BYTES = 10000000;
/** Soft warning threshold for total prompt size (100 KB) */
export declare const MAX_PROMPT_BYTES = 100000;
/** Maximum characters for a --system prompt (10 KB) */
export declare const MAX_SYSTEM_CHARS = 10000;
/** Maximum characters for the --agent flag value (64 chars is plenty) */
export declare const MAX_AGENT_FLAG_CHARS = 64;
/** How long to wait for stdin to finish sending data */
export declare const STDIN_TIMEOUT_MS = 30000;
/** How long `ctx generate` may run before we skip it */
export declare const CTX_TIMEOUT_MS = 5000;
/** HTTP probe timeout for Ollama availability check */
export declare const OLLAMA_PROBE_TIMEOUT_MS = 1500;
/** Maximum tokens to request from each agent */
export declare const MAX_OUTPUT_TOKENS = 4096;
export declare const DEFAULT_BEDROCK_MODEL = "us.anthropic.claude-3-5-sonnet-20241022-v2:0";
export declare const DEFAULT_BEDROCK_REGION = "us-east-1";
export declare const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export declare const DEFAULT_OPENAI_MODEL = "gpt-4o";
export declare const DEFAULT_OLLAMA_MODEL = "qwen2.5";
export declare const OPENAI_API_BASE = "https://api.openai.com/v1";
export declare const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export declare const OLLAMA_API_BASE: string;
/** Width of decorative rules in the terminal output */
export declare const RULE_WIDTH = 60;
//# sourceMappingURL=config.d.ts.map