import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildFreshnessCheck } from '../../src/checks/build-freshness.js';
import { Status } from '../../src/types.js';

describe('buildFreshnessCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-build-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('skips when no build directory exists', async () => {
    const result = await buildFreshnessCheck.run(root);
    expect(result.status).toBe(Status.Skip);
    expect(result.summary).toBe('No build dir');
  });

  it('passes when dist exists but no source dir', async () => {
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'index.js'), 'output');
    const result = await buildFreshnessCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('passes when build is fresh (dist newer than src)', async () => {
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'index.ts'), 'source');

    // Write build file after source — guaranteed newer
    await new Promise((r) => setTimeout(r, 10));
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'index.js'), 'output');

    const result = await buildFreshnessCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('Fresh');
  });

  it('warns when build directory is empty', async () => {
    fs.mkdirSync(path.join(root, 'dist'));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'index.ts'), 'source');
    const result = await buildFreshnessCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toContain('empty');
  });

  it('warns when source is newer than build', async () => {
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'index.js'), 'old output');

    // Write source after build — guaranteed newer
    await new Promise((r) => setTimeout(r, 10));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'index.ts'), 'new source');

    const result = await buildFreshnessCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toMatch(/Stale/);
  });
});
