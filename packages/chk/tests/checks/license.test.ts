import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { licenseCheck } from '../../src/checks/license.js';
import { Status } from '../../src/types.js';

describe('licenseCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-license-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes when LICENSE file is present', async () => {
    fs.writeFileSync(path.join(root, 'LICENSE'), 'MIT License...');
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('Present');
  });

  it('passes for LICENSE.md', async () => {
    fs.writeFileSync(path.join(root, 'LICENSE.md'), 'MIT License...');
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('warns when license is in package.json but no file', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ license: 'MIT' }));
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('MIT (no file)');
  });

  it('warns when license is in Cargo.toml but no file', async () => {
    fs.writeFileSync(path.join(root, 'Cargo.toml'), '[package]\nname = "foo"\nlicense = "Apache-2.0"\n');
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('Apache-2.0 (no file)');
  });

  it('fails when no license file or declaration exists', async () => {
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('Missing');
  });

  it('fails when package.json has no license field and no file', async () => {
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'foo' }));
    const result = await licenseCheck.run(root);
    expect(result.status).toBe(Status.Fail);
  });
});
