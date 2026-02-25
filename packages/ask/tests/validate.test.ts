import { describe, it, expect } from 'vitest';
import {
  validateAgentFlag,
  validatePrompt,
  validateSystemPrompt,
  validateStdinSize,
  validateModelName,
} from '../src/validate.js';
import { AskError, ErrorCode } from '../src/errors.js';
import {
  MAX_AGENT_FLAG_CHARS,
  MAX_SYSTEM_CHARS,
  MAX_STDIN_BYTES,
} from '../src/config.js';

// ── validateAgentFlag ────────────────────────────────────────────────────────

describe('validateAgentFlag', () => {
  it('accepts a bare agent id', () => {
    const result = validateAgentFlag('bedrock');
    expect(result).toEqual({ id: 'bedrock', model: undefined });
  });

  it('accepts id:model format', () => {
    const result = validateAgentFlag('ollama:qwen2.5');
    expect(result).toEqual({ id: 'ollama', model: 'qwen2.5' });
  });

  it('accepts complex model names', () => {
    const result = validateAgentFlag('ollama:qwen2.5:7b');
    expect(result).toEqual({ id: 'ollama', model: 'qwen2.5:7b' });
  });

  it('accepts openai with model override', () => {
    const result = validateAgentFlag('openai:gpt-4-turbo');
    expect(result).toEqual({ id: 'openai', model: 'gpt-4-turbo' });
  });

  it('throws INVALID_AGENT_FLAG for empty string', () => {
    expect(() => validateAgentFlag('')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_AGENT_FLAG })
    );
  });

  it('throws INVALID_AGENT_FLAG for whitespace-only', () => {
    expect(() => validateAgentFlag('   ')).toThrow(AskError);
  });

  it('throws INVALID_AGENT_FLAG for invalid characters', () => {
    expect(() => validateAgentFlag('agent; rm -rf /')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_AGENT_FLAG })
    );
  });

  it('throws INVALID_AGENT_FLAG for shell injection attempt', () => {
    expect(() => validateAgentFlag('$(whoami)')).toThrow(AskError);
  });

  it('throws INVALID_AGENT_FLAG for value over max length', () => {
    const long = 'a'.repeat(MAX_AGENT_FLAG_CHARS + 1);
    expect(() => validateAgentFlag(long)).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_AGENT_FLAG })
    );
  });

  it('throws UNKNOWN_AGENT for unrecognised agent id', () => {
    expect(() => validateAgentFlag('grok')).toThrow(
      expect.objectContaining({ code: ErrorCode.UNKNOWN_AGENT })
    );
  });

  it('throws UNKNOWN_AGENT even with a valid model suffix', () => {
    expect(() => validateAgentFlag('grok:fast')).toThrow(
      expect.objectContaining({ code: ErrorCode.UNKNOWN_AGENT })
    );
  });
});

// ── validatePrompt ───────────────────────────────────────────────────────────

describe('validatePrompt', () => {
  it('returns prompt unchanged for normal input', () => {
    expect(validatePrompt('hello world')).toBe('hello world');
  });

  it('throws EMPTY_PROMPT for empty string', () => {
    expect(() => validatePrompt('')).toThrow(
      expect.objectContaining({ code: ErrorCode.EMPTY_PROMPT })
    );
  });

  it('throws EMPTY_PROMPT for whitespace-only', () => {
    expect(() => validatePrompt('   \n\t  ')).toThrow(
      expect.objectContaining({ code: ErrorCode.EMPTY_PROMPT })
    );
  });

  it('returns a large (but under-limit) prompt without error', () => {
    // 80 KB — under the 100 KB warning threshold
    const bigPrompt = 'x'.repeat(80_000);
    expect(() => validatePrompt(bigPrompt)).not.toThrow();
  });
});

// ── validateSystemPrompt ─────────────────────────────────────────────────────

describe('validateSystemPrompt', () => {
  it('returns trimmed value for valid input', () => {
    expect(validateSystemPrompt('  be concise  ')).toBe('be concise');
  });

  it('accepts an empty string (no system prompt)', () => {
    expect(() => validateSystemPrompt('')).not.toThrow();
  });

  it('throws SYSTEM_TOO_LONG when exceeding max', () => {
    const too_long = 'x'.repeat(MAX_SYSTEM_CHARS + 1);
    expect(() => validateSystemPrompt(too_long)).toThrow(
      expect.objectContaining({ code: ErrorCode.SYSTEM_TOO_LONG })
    );
  });

  it('accepts exactly MAX_SYSTEM_CHARS characters', () => {
    const exact = 'x'.repeat(MAX_SYSTEM_CHARS);
    expect(() => validateSystemPrompt(exact)).not.toThrow();
  });
});

// ── validateStdinSize ────────────────────────────────────────────────────────

describe('validateStdinSize', () => {
  it('does not throw for byte count under limit', () => {
    expect(() => validateStdinSize(1_000_000)).not.toThrow();
  });

  it('throws STDIN_TOO_LARGE when limit is exceeded', () => {
    expect(() => validateStdinSize(MAX_STDIN_BYTES + 1)).toThrow(
      expect.objectContaining({ code: ErrorCode.STDIN_TOO_LARGE })
    );
  });
});

// ── validateModelName ────────────────────────────────────────────────────────

describe('validateModelName', () => {
  it('accepts alphanumeric model names', () => {
    expect(validateModelName('llama3')).toBe('llama3');
  });

  it('accepts models with dots and colons', () => {
    expect(validateModelName('qwen2.5:7b')).toBe('qwen2.5:7b');
  });

  it('accepts models with hyphens', () => {
    expect(validateModelName('deepseek-coder-v2')).toBe('deepseek-coder-v2');
  });

  it('throws for empty model name', () => {
    expect(() => validateModelName('')).toThrow(AskError);
  });

  it('throws for model names with shell-special characters', () => {
    expect(() => validateModelName('model; cat /etc/passwd')).toThrow(AskError);
  });
});
