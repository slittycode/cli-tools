/**
 * Input validation for ask-cli.
 *
 * Each function either returns the (possibly normalised) valid value
 * or throws an AskError with an actionable message.
 * None of these functions have side effects.
 */

import { AskError, ErrorCode } from './errors.js';
import {
  MAX_AGENT_FLAG_CHARS,
  MAX_PROMPT_BYTES,
  MAX_STDIN_BYTES,
  MAX_SYSTEM_CHARS,
} from './config.js';
import type { AgentId } from './types.js';

/** All valid agent ids — kept in sync with types.ts */
const VALID_AGENT_IDS: ReadonlySet<AgentId> = new Set<AgentId>([
  'claude-cli',
  'bedrock',
  'openai',
  'gemini',
  'ollama',
]);

/**
 * Agent flag format: `<id>` or `<id>:<model>`
 * e.g. "ollama", "ollama:qwen2.5", "bedrock", "openai:gpt-4-turbo"
 *
 * - id:    lowercase letters and hyphens only
 * - model: alphanumeric + hyphens, dots, underscores, colons (e.g. "qwen2.5:7b")
 */
const AGENT_FLAG_RE = /^[a-z][a-z-]*(?::[A-Za-z0-9][A-Za-z0-9._:-]*)?$/;

/**
 * Validate the value passed to --agent.
 * Returns `{ id, model }` on success, throws AskError on failure.
 */
export function validateAgentFlag(raw: string): { id: AgentId; model?: string } {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new AskError(ErrorCode.INVALID_AGENT_FLAG, '--agent value cannot be empty');
  }

  if (trimmed.length > MAX_AGENT_FLAG_CHARS) {
    throw new AskError(
      ErrorCode.INVALID_AGENT_FLAG,
      `--agent value too long (max ${MAX_AGENT_FLAG_CHARS} chars)`
    );
  }

  if (!AGENT_FLAG_RE.test(trimmed)) {
    throw new AskError(
      ErrorCode.INVALID_AGENT_FLAG,
      `Invalid --agent format "${trimmed}". Expected <id> or <id>:<model>, e.g. "ollama:qwen2.5"`
    );
  }

  const colonIdx = trimmed.indexOf(':');
  const id = (colonIdx === -1 ? trimmed : trimmed.slice(0, colonIdx)) as AgentId;
  const model = colonIdx === -1 ? undefined : trimmed.slice(colonIdx + 1);

  if (!VALID_AGENT_IDS.has(id)) {
    throw new AskError(
      ErrorCode.UNKNOWN_AGENT,
      `Unknown agent "${id}". Valid agents: ${[...VALID_AGENT_IDS].join(', ')}`
    );
  }

  return { id, model };
}

/**
 * Validate a fully assembled prompt string.
 * - Rejects empty / whitespace-only prompts
 * - Emits a stderr warning (but does NOT reject) if the prompt is very large
 *
 * Returns the prompt unchanged on success.
 */
export function validatePrompt(prompt: string): string {
  if (!prompt || !prompt.trim()) {
    throw new AskError(ErrorCode.EMPTY_PROMPT, 'Prompt is empty');
  }

  const byteLen = Buffer.byteLength(prompt, 'utf8');

  if (byteLen > MAX_PROMPT_BYTES) {
    // Warn but continue — large prompts are valid; the user may be intentional
    process.stderr.write(
      `Warning: prompt is ${Math.round(byteLen / 1024)} KB — some agents may truncate or reject it.\n`
    );
  }

  return prompt;
}

/**
 * Validate a raw stdin chunk count against the hard size limit.
 * Call each time a 'data' event fires with the current cumulative byte count.
 * Throws AskError if the limit is exceeded.
 */
export function validateStdinSize(bytesSoFar: number): void {
  if (bytesSoFar > MAX_STDIN_BYTES) {
    throw new AskError(
      ErrorCode.STDIN_TOO_LARGE,
      `stdin exceeds the ${MAX_STDIN_BYTES / 1_000_000} MB limit. Pipe a smaller input.`
    );
  }
}

/**
 * Validate the --system prompt value.
 * Returns the trimmed string on success, throws AskError if too long.
 */
export function validateSystemPrompt(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length > MAX_SYSTEM_CHARS) {
    throw new AskError(
      ErrorCode.SYSTEM_TOO_LONG,
      `--system value is too long (${trimmed.length} chars, max ${MAX_SYSTEM_CHARS})`
    );
  }
  return trimmed;
}

/**
 * Validate an Ollama model name (the part after the colon in "ollama:model").
 * Model names must be alphanumeric + hyphens / dots / underscores / colons.
 * Returns the model name unchanged on success, throws AskError otherwise.
 */
export function validateModelName(model: string): string {
  if (!model.trim()) {
    throw new AskError(ErrorCode.INVALID_AGENT_FLAG, 'Model name cannot be empty');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(model)) {
    throw new AskError(
      ErrorCode.INVALID_AGENT_FLAG,
      `Invalid model name "${model}". Use letters, digits, hyphens, dots, and colons only.`
    );
  }
  return model;
}
