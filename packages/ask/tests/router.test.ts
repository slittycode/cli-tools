import { describe, it, expect } from 'vitest';
import { parseAgentFlag } from '../src/router.js';
import { validateAgentFlag } from '../src/validate.js';
import { AskError, ErrorCode } from '../src/errors.js';

// parseAgentFlag now delegates to validateAgentFlag — test the integration

describe('parseAgentFlag (via router)', () => {
  it('parses a bare id', () => {
    expect(parseAgentFlag('bedrock')).toEqual({ id: 'bedrock', model: undefined });
  });

  it('parses id:model', () => {
    expect(parseAgentFlag('ollama:llama3')).toEqual({ id: 'ollama', model: 'llama3' });
  });

  it('parses id:model with version tag', () => {
    expect(parseAgentFlag('ollama:qwen2.5:7b')).toEqual({ id: 'ollama', model: 'qwen2.5:7b' });
  });

  it('throws for unknown agent id', () => {
    expect(() => parseAgentFlag('unknown-agent')).toThrow(
      expect.objectContaining({ code: ErrorCode.UNKNOWN_AGENT })
    );
  });

  it('throws for malformed flag with shell characters', () => {
    expect(() => parseAgentFlag('ollama && rm -rf /')).toThrow(AskError);
  });
});

// Direct validateAgentFlag edge cases
describe('validateAgentFlag — all valid agent ids', () => {
  const VALID_IDS = ['claude-cli', 'bedrock', 'openai', 'gemini', 'ollama'] as const;

  for (const id of VALID_IDS) {
    it(`accepts "${id}"`, () => {
      expect(() => validateAgentFlag(id)).not.toThrow();
    });
  }

  it('rejects "cline" (VS Code only, not a shell agent)', () => {
    expect(() => validateAgentFlag('cline')).toThrow(
      expect.objectContaining({ code: ErrorCode.UNKNOWN_AGENT })
    );
  });
});
