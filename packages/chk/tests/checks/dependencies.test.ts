import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dependenciesCheck } from '../../src/checks/dependencies.js';
import { Status } from '../../src/types.js';

describe('dependenciesCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-deps-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('skips when no package manager files exist', async () => {
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Skip);
    expect(result.summary).toBe('No package manager');
  });

  it('fails when package.json exists but no lock file', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('No lock file');
  });

  it('passes when npm lock file and node_modules exist', async () => {
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    fs.mkdirSync(path.join(root, 'node_modules'));
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('npm · installed');
  });

  it('warns when npm lock file exists but node_modules is missing', async () => {
    fs.writeFileSync(path.join(root, 'package-lock.json'), '{}');
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('npm · not installed');
  });

  it('passes for go.sum (no install dir required)', async () => {
    fs.writeFileSync(path.join(root, 'go.sum'), '');
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('go · locked');
  });

  it('passes when bun lock file and node_modules exist', async () => {
    fs.writeFileSync(path.join(root, 'bun.lock'), '');
    fs.mkdirSync(path.join(root, 'node_modules'));
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('bun · installed');
  });

  it('warns when cargo lock exists but target dir is missing', async () => {
    fs.writeFileSync(path.join(root, 'Cargo.lock'), '');
    const result = await dependenciesCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('cargo · not installed');
  });
});
