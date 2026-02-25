import { describe, it, expect } from 'vitest';
import { sanitizeForDisplay, wrapAgentError, AskError, ErrorCode } from '../src/errors.js';

// ── sanitizeForDisplay ───────────────────────────────────────────────────────

describe('sanitizeForDisplay', () => {
  it('redacts an OpenAI sk- key', () => {
    const input = 'Authorization failed for key sk-abc123XYZabcdefghij1234567890';
    const result = sanitizeForDisplay(input);
    expect(result).not.toContain('sk-abc123');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts an OpenAI project key (sk-proj-)', () => {
    const input = 'invalid key: sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef';
    const result = sanitizeForDisplay(input);
    expect(result).not.toMatch(/sk-proj-[A-Za-z0-9]/);
    expect(result).toContain('[REDACTED]');
  });

  it('redacts an AWS access key (AKIA...)', () => {
    const input = 'AWS error: AccessKeyId AKIAIOSFODNN7EXAMPLE not found';
    const result = sanitizeForDisplay(input);
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts a Google API key (AIza...)', () => {
    const input = 'quota exceeded for key AIzaSyD-9tSrke72I6e1234567890abcdefghij';
    const result = sanitizeForDisplay(input);
    expect(result).not.toMatch(/AIza[A-Za-z0-9]/);
    expect(result).toContain('[REDACTED]');
  });

  it('leaves normal text unchanged', () => {
    const msg = 'HTTP 429: rate limit exceeded, retry after 60 seconds';
    expect(sanitizeForDisplay(msg)).toBe(msg);
  });

  it('handles strings with no sensitive content', () => {
    expect(sanitizeForDisplay('')).toBe('');
    expect(sanitizeForDisplay('hello world')).toBe('hello world');
  });

  it('redacts multiple keys in one string', () => {
    const input = 'key1=sk-aaaaaaaaaaaaaaaaaaaaaaaa key2=AKIAIOSFODNN7EXAMPLE';
    const result = sanitizeForDisplay(input);
    expect(result).not.toContain('sk-aaa');
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });
});

// ── wrapAgentError ───────────────────────────────────────────────────────────

describe('wrapAgentError', () => {
  it('returns an AskError with AGENT_ERROR code', () => {
    const err = wrapAgentError('TestAgent', new Error('something broke'));
    expect(err).toBeInstanceOf(AskError);
    expect(err.code).toBe(ErrorCode.AGENT_ERROR);
  });

  it('includes the agent name in the message', () => {
    const err = wrapAgentError('OpenAI', new Error('timeout'));
    expect(err.message).toContain('OpenAI');
  });

  it('sanitizes API keys inside error messages', () => {
    const raw = new Error('auth failed: sk-projABCDEFGHIJKLMNOPQRSTUVWXYZ1234');
    const err = wrapAgentError('OpenAI', raw);
    expect(err.message).not.toMatch(/sk-proj[A-Za-z0-9]/);
    expect(err.message).toContain('[REDACTED]');
  });

  it('handles non-Error thrown values', () => {
    const err = wrapAgentError('Gemini', 'string error');
    expect(err.message).toContain('string error');
  });

  it('handles thrown objects', () => {
    const err = wrapAgentError('Bedrock', { code: 500 });
    expect(err).toBeInstanceOf(AskError);
  });
});

// ── AskError ─────────────────────────────────────────────────────────────────

describe('AskError', () => {
  it('has the correct name', () => {
    const err = new AskError(ErrorCode.EMPTY_PROMPT, 'empty');
    expect(err.name).toBe('AskError');
  });

  it('stores the error code', () => {
    const err = new AskError(ErrorCode.UNKNOWN_AGENT, 'msg');
    expect(err.code).toBe(ErrorCode.UNKNOWN_AGENT);
  });

  it('is an instanceof Error', () => {
    expect(new AskError(ErrorCode.NO_AGENTS, 'x')).toBeInstanceOf(Error);
  });
});
