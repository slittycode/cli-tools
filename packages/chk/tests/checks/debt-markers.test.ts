import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { debtMarkersCheck } from '../../src/checks/debt-markers.js';
import { Status } from '../../src/types.js';

describe('debtMarkersCheck', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chk-debt-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes when no debt markers are found', async () => {
    fs.writeFileSync(path.join(root, 'index.ts'), 'const x = 1;\n');
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Pass);
    expect(result.summary).toBe('None found');
  });

  it('warns when 1-10 markers are found', async () => {
    fs.writeFileSync(path.join(root, 'index.ts'), '// TODO: fix this\n// FIXME: broken\n');
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('2 found');
  });

  it('fails when more than 10 markers are found', async () => {
    const lines = Array.from({ length: 11 }, (_, i) => `// TODO: item ${i + 1}`).join('\n');
    fs.writeFileSync(path.join(root, 'index.ts'), lines);
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Fail);
    expect(result.summary).toBe('11 found');
  });

  it('detects TODO, FIXME, HACK, and XXX markers', async () => {
    fs.writeFileSync(path.join(root, 'code.ts'), '// TODO: one\n// FIXME: two\n// HACK: three\n// XXX: four\n');
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Warn);
    expect(result.summary).toBe('4 found');
  });

  it('skips files in node_modules', async () => {
    fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'index.js'), '// TODO: this should be ignored\n');
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });

  it('skips files in dist', async () => {
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist', 'index.js'), '// TODO: this should be ignored\n');
    const result = await debtMarkersCheck.run(root);
    expect(result.status).toBe(Status.Pass);
  });
});
