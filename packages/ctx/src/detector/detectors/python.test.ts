import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectPython } from './python.js';

const FIXTURES = new URL('../../../tests/fixtures', import.meta.url).pathname;

describe('detectPython', () => {
  it('returns null when no Python files', () => {
    expect(detectPython(path.join(FIXTURES, 'empty'))).toBeNull();
  });

  it('detects Python from pyproject.toml', () => {
    const result = detectPython(path.join(FIXTURES, 'python'));
    expect(result?.language).toBe('Python');
  });

  it('detects FastAPI framework', () => {
    const result = detectPython(path.join(FIXTURES, 'python'));
    expect(result?.framework).toBe('FastAPI');
  });

  it('detects requires-python version', () => {
    const result = detectPython(path.join(FIXTURES, 'python'));
    expect(result?.runtime).toContain('3.12');
  });

  it('detects mypy tool', () => {
    const result = detectPython(path.join(FIXTURES, 'python'));
    expect(result?.tools).toContain('mypy');
  });

  it('detects ruff tool', () => {
    const result = detectPython(path.join(FIXTURES, 'python'));
    expect(result?.tools).toContain('ruff');
  });

  describe('requirements.txt fallback', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-py-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects Python from requirements.txt alone', () => {
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask\n');
      const result = detectPython(tmpDir);
      expect(result?.language).toBe('Python');
    });

    it('detects Django from pyproject', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'pyproject.toml'),
        '[project]\ndependencies = ["django"]\n',
      );
      expect(detectPython(tmpDir)?.framework).toBe('Django');
    });

    it('detects .python-version runtime', () => {
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), '');
      fs.writeFileSync(path.join(tmpDir, '.python-version'), '3.11.2');
      expect(detectPython(tmpDir)?.runtime).toBe('Python 3.11.2');
    });
  });
});
