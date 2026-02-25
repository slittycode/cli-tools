/**
 * Core types for ask-cli
 */

/** All supported agent identifiers */
export type AgentId =
  | 'claude-cli'   // Anthropic Claude Code CLI (`claude`)
  | 'bedrock'      // AWS Bedrock (Claude via API)
  | 'openai'       // OpenAI ChatGPT REST API (OPENAI_API_KEY)
  | 'gemini'       // Google Gemini REST API / CLI
  | 'ollama'       // Local Ollama (any model, including Qwen)
  | 'cline';       // Cline — VS Code only, listed for status display

/** A discovered agent with its availability status */
export interface AgentInfo {
  id: AgentId;
  /** Human-readable name */
  name: string;
  /** Short description of how it connects */
  via: string;
  /** Whether the agent is usable right now */
  available: boolean;
  /** Reason unavailable (missing binary, missing key, etc.) */
  reason?: string;
  /** Model identifier, if relevant (e.g. ollama model name) */
  model?: string;
}

/** Options passed to an agent's ask() method */
export interface AskOptions {
  /** System prompt prefix to prepend */
  system?: string;
  /** Stream tokens to stdout as they arrive */
  stream?: boolean;
  /** If using ollama, which model to use */
  model?: string;
}

/** A streamable agent that can answer a prompt */
export interface Agent {
  info: AgentInfo;
  /**
   * Send a prompt and yield response chunks.
   * Implementations should stream when possible.
   */
  ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
}

/** Parsed CLI options */
export interface CLIOptions {
  /** The prompt string (may also come from stdin) */
  prompt?: string;
  /** Pin to a specific agent id, or "id:model" e.g. "ollama:qwen2.5" */
  agent?: string;
  /** Send to all available agents sequentially */
  all: boolean;
  /** Show agent availability status and exit */
  status: boolean;
  /** Skip ctx context injection */
  noContext: boolean;
  /** System prompt override */
  system?: string;
}
