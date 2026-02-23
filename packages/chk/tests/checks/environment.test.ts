import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environmentCheck } from '../../src/checks/environment.js';
import { Status } from '../../src/types.js';

describe('environmentCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-env-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes as N/A when no .env files exist', async () => {
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('N/A');
  });

  it('passes as Configured when .env is present', async () => {
    fs.writeFileSync(path.join(root, '.env'), 'PORT=3000\n');
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('Configured');
  });

  it('warns when .env.example exists but .env is missing', async () => {
    fs.writeFileSync(path.join(root, '.env.example'), 'PORT=3000\n');
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('Missing .env');
  });

  it('warns when .env.sample exists but .env is missing', async () => {
    fs.writeFileSync(path.join(root, '.env.sample'), 'PORT=3000\n');
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Warn);
  });

  it('fails when a source file contains a secret pattern', async () => {
    fs.writeFileSync(path.join(root, 'config.ts'), 'const api_key = "supersecretvalue123";\n');
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('Secrets detected');
  });

  it('fails when a file contains a GitHub token pattern', async () => {
    fs.writeFileSync(path.join(root, 'deploy.ts'), `const token = "ghp_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ";\n`);
    const result = await environmentCheck.run(root);
    expect(result.status).toBe(Status.Fail);
  });
});
