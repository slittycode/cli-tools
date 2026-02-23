import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gitignoreCheck } from '../../src/checks/gitignore.js';
import { Status } from '../../src/types.js';

describe('gitignoreCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-gitignore-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('fails when no .gitignore exists', async () => {
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('Missing');
  });

  it('passes for npm project with all expected entries', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\n.env\n');
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('Configured');
  });

  it('warns when npm project is missing node_modules in .gitignore', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, '.gitignore'), '.env\n');
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('1 missing');
    expect(result.details).toContain('Missing: node_modules');
  });

  it('passes when .gitignore has no stack indicator files', async () => {
    fs.writeFileSync(path.join(root, '.gitignore'), '.DS_Store\n');
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('passes for Cargo project with target in .gitignore', async () => {
    fs.writeFileSync(path.join(root, 'Cargo.toml'), '[package]');
    fs.writeFileSync(path.join(root, '.gitignore'), 'target\n');
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('accepts trailing slash form (node_modules/)', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n.env\n');
    const result = await gitignoreCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });
});
