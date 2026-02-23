import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readmeCheck } from '../../src/checks/readme.js';
import { Status } from '../../src/types.js';

describe('readmeCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-readme-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes when README.md has content', async () => {
    fs.writeFileSync(path.join(root, 'README.md'), '# My Project\n\nSome description here.');
    const result = await readmeCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('Present');
  });

  it('warns when README.md is nearly empty', async () => {
    fs.writeFileSync(path.join(root, 'README.md'), '# Hi');
    const result = await readmeCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('Empty');
  });

  it('fails when no README file exists', async () => {
    const result = await readmeCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('Missing');
  });

  it('passes for readme.md (lowercase)', async () => {
    fs.writeFileSync(path.join(root, 'readme.md'), '# My Project\n\nSome description here.');
    const result = await readmeCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('passes for README without extension', async () => {
    fs.writeFileSync(path.join(root, 'README'), 'This is a readme file with enough content.');
    const result = await readmeCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });
});
