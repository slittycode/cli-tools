import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildDirectoryStructure,
  getGitStatus,
  getRecentFiles,
} from '../../src/collector/Collector.js';
import { ensureConfigDir, loadPreferences } from '../../src/config/Config.js';
import { detect } from '../../src/detector/Detector.js';
import { format } from '../../src/formatter/Formatter.js';
import type { ContextOutput, ProjectContext } from '../../src/types.js';

let tmpDir: string;
let ctxHome: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-integration-'));
  ctxHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-home-'));
  process.env['CTX_HOME'] = ctxHome;
  ensureConfigDir();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(ctxHome, { recursive: true, force: true });
  delete process.env['CTX_HOME'];
});

describe('full pipeline: detect → collect → format', () => {
  it('produces a context block for a TypeScript project', async () => {
    // Set up a minimal TS project fixture
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: { express: '*' },
        devDependencies: { typescript: '*' },
      }),
    );
    fs.mkdirSync(path.join(tmpDir, 'src'));
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.ts'), 'export const x = 1;');

    const stack = detect(tmpDir);
    expect(stack.language).toBe('TypeScript');
    expect(stack.framework).toBe('Express');

    const structure = buildDirectoryStructure(tmpDir);
    expect(structure.name).toBe(path.basename(tmpDir));

    const git = await getGitStatus(tmpDir);
    // tmpDir is not a git repo, so this should be null
    expect(git).toBeNull();

    const recentFiles = getRecentFiles(tmpDir, 5);
    expect(recentFiles.length).toBeGreaterThan(0);

    const preferences = loadPreferences(tmpDir);

    const project: ProjectContext = {
      name: path.basename(tmpDir),
      path: tmpDir,
      stack,
      structure,
      recentFiles,
      includedFiles: [],
    };
    const output: ContextOutput = { project, preferences };
    const result = format(output);

    expect(result).toContain('<context>');
    expect(result).toContain('</context>');
    expect(result).toContain('TypeScript');
    expect(result).toContain('Express');
    expect(result).toContain('Structure:');
  });

  it('produces a context block for a Python project', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\nname = "myapp"\ndependencies = ["fastapi"]\n',
    );

    const stack = detect(tmpDir);
    expect(stack.language).toBe('Python');
    expect(stack.framework).toBe('FastAPI');

    const structure = buildDirectoryStructure(tmpDir);
    const git = await getGitStatus(tmpDir);
    const preferences = loadPreferences(tmpDir);

    const project: ProjectContext = {
      name: path.basename(tmpDir),
      path: tmpDir,
      stack,
      structure,
      recentFiles: [],
      includedFiles: [],
    };
    const result = format({ project, preferences });
    expect(result).toContain('Python');
    expect(result).toContain('FastAPI');
  });

  it('omits git section for non-git directory', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', devDependencies: { typescript: '*' } }),
    );

    const git = await getGitStatus(tmpDir);
    expect(git).toBeNull();

    const project: ProjectContext = {
      name: path.basename(tmpDir),
      path: tmpDir,
      stack: { language: 'TypeScript', tools: [] },
      structure: { name: tmpDir, children: [], fileCount: 0 },
      recentFiles: [],
      includedFiles: [],
    };
    const result = format({ project, preferences: { global: {}, project: {} } });
    expect(result).not.toContain('Git:');
  });

  it('handles empty directory gracefully', async () => {
    const stack = detect(tmpDir);
    expect(stack.language).toBe('Unknown');

    const structure = buildDirectoryStructure(tmpDir);
    expect(structure.children).toEqual([]);

    const project: ProjectContext = {
      name: 'empty',
      path: tmpDir,
      stack,
      structure,
      recentFiles: [],
      includedFiles: [],
    };
    const result = format({ project, preferences: { global: {}, project: {} } });
    expect(result).toContain('<context>');
    expect(result).toContain('</context>');
  });
});
