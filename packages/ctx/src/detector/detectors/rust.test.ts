import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectRust } from './rust.js';

const FIXTURES = new URL('../../../tests/fixtures', import.meta.url).pathname;

describe('detectRust', () => {
  it('returns null when no Cargo.toml', () => {
    expect(detectRust(path.join(FIXTURES, 'empty'))).toBeNull();
  });

  it('detects Rust from Cargo.toml', () => {
    const result = detectRust(path.join(FIXTURES, 'rust'));
    expect(result?.language).toBe('Rust');
  });

  it('detects Axum framework', () => {
    const result = detectRust(path.join(FIXTURES, 'rust'));
    expect(result?.framework).toBe('Axum');
  });

  it('sets packageManager to cargo', () => {
    const result = detectRust(path.join(FIXTURES, 'rust'));
    expect(result?.packageManager).toBe('cargo');
  });
});
