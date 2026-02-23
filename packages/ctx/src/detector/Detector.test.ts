import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detect } from './Detector.js';

const FIXTURES = new URL('../../tests/fixtures', import.meta.url).pathname;

describe('detect', () => {
  it('detects TypeScript Node project', () => {
    const stack = detect(path.join(FIXTURES, 'node-ts'));
    expect(stack.language).toBe('TypeScript');
    expect(stack.framework).toBe('Express');
    expect(stack.tools).toContain('ESLint');
  });

  it('detects Python project', () => {
    const stack = detect(path.join(FIXTURES, 'python'));
    expect(stack.language).toBe('Python');
    expect(stack.framework).toBe('FastAPI');
  });

  it('detects Rust project', () => {
    const stack = detect(path.join(FIXTURES, 'rust'));
    expect(stack.language).toBe('Rust');
    expect(stack.packageManager).toBe('cargo');
  });

  it('detects Go project', () => {
    const stack = detect(path.join(FIXTURES, 'go'));
    expect(stack.language).toBe('Go');
    expect(stack.runtime).toBe('Go 1.22');
  });

  it('returns Unknown for empty directory', () => {
    const stack = detect(path.join(FIXTURES, 'empty'));
    expect(stack.language).toBe('Unknown');
    expect(stack.tools).toEqual([]);
  });
});
