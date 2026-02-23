import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDirectoryStructure,
  getGitStatus,
  getRecentFiles,
  isBinaryFile,
  readFiles,
} from './Collector.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-collector-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('isBinaryFile', () => {
  it('detects png by extension', () => {
    const f = path.join(tmpDir, 'img.png');
    fs.writeFileSync(f, 'fake');
    expect(isBinaryFile(f)).toBe(true);
  });

  it('detects binary content via null byte', () => {
    const f = path.join(tmpDir, 'bin.dat');
    const buf = Buffer.alloc(10, 0);
    fs.writeFileSync(f, buf);
    expect(isBinaryFile(f)).toBe(true);
  });

  it('does not flag plain text', () => {
    const f = path.join(tmpDir, 'hello.ts');
    fs.writeFileSync(f, 'export const x = 1;\n');
    expect(isBinaryFile(f)).toBe(false);
  });
});

describe('buildDirectoryStructure', () => {
  it('returns directory name', () => {
    const result = buildDirectoryStructure(tmpDir);
    expect(result.name).toBe(path.basename(tmpDir));
  });

  it('lists files', () => {
    fs.writeFileSync(path.join(tmpDir, 'foo.ts'), '');
    const result = buildDirectoryStructure(tmpDir);
    expect(result.children).toContain('foo.ts');
  });

  it('excludes node_modules', () => {
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.js'), '');
    const result = buildDirectoryStructure(tmpDir);
    const names = result.children.map((c) => (typeof c === 'string' ? c : c.name));
    expect(names).not.toContain('node_modules');
  });

  it('respects .gitignore', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'ignored-dir/\n');
    fs.mkdirSync(path.join(tmpDir, 'ignored-dir'));
    fs.writeFileSync(path.join(tmpDir, 'ignored-dir', 'file.ts'), '');
    const result = buildDirectoryStructure(tmpDir);
    const names = result.children.map((c) => (typeof c === 'string' ? c : c.name));
    expect(names).not.toContain('ignored-dir');
  });

  it('respects maxDepth', () => {
    fs.mkdirSync(path.join(tmpDir, 'deep', 'nested', 'dir'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'deep', 'nested', 'dir', 'file.ts'), '');
    const result = buildDirectoryStructure(tmpDir, { maxDepth: 1 });
    const deep = result.children.find(
      (c): c is DirectoryStructure => typeof c !== 'string' && c.name === 'deep',
    );
    // deep exists but nested content is limited
    expect(deep).toBeDefined();
  });

  it('caps at maxFiles', () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tmpDir, `file${i}.ts`), '');
    }
    const result = buildDirectoryStructure(tmpDir, { maxFiles: 5 });
    expect(result.children.length).toBeLessThanOrEqual(5);
  });
});

interface DirectoryStructure {
  name: string;
  children: (DirectoryStructure | string)[];
  fileCount: number;
}

describe('getGitStatus', () => {
  it('returns null for non-git directory', async () => {
    const result = await getGitStatus(tmpDir);
    expect(result).toBeNull();
  });
});

describe('getRecentFiles', () => {
  it('returns files sorted by mtime descending', () => {
    const old = path.join(tmpDir, 'old.ts');
    const newer = path.join(tmpDir, 'newer.ts');
    fs.writeFileSync(old, 'old');
    // Small delay to ensure different mtime
    const oldTime = new Date(Date.now() - 5000);
    fs.utimesSync(old, oldTime, oldTime);
    fs.writeFileSync(newer, 'newer');

    const files = getRecentFiles(tmpDir, 10);
    expect(files[0]?.relativePath).toBe('newer.ts');
  });

  it('respects count limit', () => {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(tmpDir, `f${i}.ts`), '');
    }
    expect(getRecentFiles(tmpDir, 3)).toHaveLength(3);
  });

  it('skips binary files', () => {
    fs.writeFileSync(path.join(tmpDir, 'img.png'), 'fake');
    fs.writeFileSync(path.join(tmpDir, 'code.ts'), 'code');
    const files = getRecentFiles(tmpDir, 10);
    expect(files.every((f) => !f.relativePath.endsWith('.png'))).toBe(true);
  });
});

describe('readFiles', () => {
  it('reads a file by exact path', () => {
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), 'const x = 1;');
    const files = readFiles(tmpDir, ['hello.ts']);
    expect(files).toHaveLength(1);
    expect(files[0]?.content).toBe('const x = 1;');
  });

  it('truncates large files', () => {
    const content = 'x'.repeat(20000);
    fs.writeFileSync(path.join(tmpDir, 'big.ts'), content);
    const files = readFiles(tmpDir, ['big.ts'], 10000);
    expect(files[0]?.content).toContain('[truncated');
    expect(files[0]?.content?.length).toBeLessThan(content.length);
  });

  it('skips binary files', () => {
    fs.writeFileSync(path.join(tmpDir, 'img.png'), 'fake');
    const files = readFiles(tmpDir, ['img.png']);
    expect(files).toHaveLength(0);
  });

  it('deduplicates when patterns match same file', () => {
    fs.writeFileSync(path.join(tmpDir, 'foo.ts'), 'hi');
    const files = readFiles(tmpDir, ['foo.ts', 'foo.ts']);
    expect(files).toHaveLength(1);
  });

  it('handles glob patterns', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'b.ts'), 'b');
    const files = readFiles(tmpDir, ['*.ts']);
    expect(files).toHaveLength(2);
  });

  it('returns empty for non-matching pattern', () => {
    const files = readFiles(tmpDir, ['nonexistent.ts']);
    expect(files).toHaveLength(0);
  });
});
