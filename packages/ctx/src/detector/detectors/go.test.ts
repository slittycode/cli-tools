import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectGo } from './go.js';

const FIXTURES = new URL('../../../tests/fixtures', import.meta.url).pathname;

describe('detectGo', () => {
  it('returns null when no go.mod', () => {
    expect(detectGo(path.join(FIXTURES, 'empty'))).toBeNull();
  });

  it('detects Go from go.mod', () => {
    const result = detectGo(path.join(FIXTURES, 'go'));
    expect(result?.language).toBe('Go');
  });

  it('detects Go version', () => {
    const result = detectGo(path.join(FIXTURES, 'go'));
    expect(result?.runtime).toBe('Go 1.22');
  });

  it('detects Gin framework', () => {
    const result = detectGo(path.join(FIXTURES, 'go'));
    expect(result?.framework).toBe('Gin');
  });

  it('sets packageManager to go modules', () => {
    const result = detectGo(path.join(FIXTURES, 'go'));
    expect(result?.packageManager).toBe('go modules');
  });
});
