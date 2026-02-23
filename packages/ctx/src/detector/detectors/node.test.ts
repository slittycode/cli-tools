import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectNode } from './node.js';

const FIXTURES = new URL('../../../tests/fixtures', import.meta.url).pathname;

describe('detectNode', () => {
  it('returns null when no package.json', () => {
    expect(detectNode(path.join(FIXTURES, 'empty'))).toBeNull();
  });

  it('detects TypeScript project', () => {
    const result = detectNode(path.join(FIXTURES, 'node-ts'));
    expect(result?.language).toBe('TypeScript');
  });

  it('detects JavaScript project', () => {
    const result = detectNode(path.join(FIXTURES, 'node-js'));
    expect(result?.language).toBe('JavaScript');
  });

  it('detects Express framework', () => {
    const result = detectNode(path.join(FIXTURES, 'node-ts'));
    expect(result?.framework).toBe('Express');
  });

  it('detects Fastify framework', () => {
    const result = detectNode(path.join(FIXTURES, 'node-js'));
    expect(result?.framework).toBe('Fastify');
  });

  it('detects runtime from engines.node', () => {
    const result = detectNode(path.join(FIXTURES, 'node-ts'));
    expect(result?.runtime).toMatch(/^Node\.js/);
    expect(result?.runtime).toContain('20');
  });

  it('detects ESLint and Prettier tools', () => {
    const result = detectNode(path.join(FIXTURES, 'node-ts'));
    expect(result?.tools).toContain('ESLint');
    expect(result?.tools).toContain('Prettier');
  });

  it('detects Vitest', () => {
    const result = detectNode(path.join(FIXTURES, 'node-ts'));
    expect(result?.tools).toContain('Vitest');
  });

  it('detects Jest', () => {
    const result = detectNode(path.join(FIXTURES, 'node-js'));
    expect(result?.tools).toContain('Jest');
  });

  describe('lockfile detection', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-node-test-'));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', devDependencies: {} }),
      );
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('detects pnpm', () => {
      fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      expect(detectNode(tmpDir)?.packageManager).toBe('pnpm');
    });

    it('detects yarn', () => {
      fs.writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
      expect(detectNode(tmpDir)?.packageManager).toBe('yarn');
    });

    it('defaults to npm', () => {
      expect(detectNode(tmpDir)?.packageManager).toBe('npm');
    });

    it('detects .nvmrc runtime', () => {
      fs.writeFileSync(path.join(tmpDir, '.nvmrc'), 'v22.1.0\n');
      expect(detectNode(tmpDir)?.runtime).toBe('Node.js 22.1.0');
    });

    it('detects Next.js framework', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: { next: '*' } }),
      );
      expect(detectNode(tmpDir)?.framework).toBe('Next.js');
    });
  });
});
