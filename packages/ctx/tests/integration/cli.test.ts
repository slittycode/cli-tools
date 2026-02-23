import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/index.js';

let tmpDir: string;
let ctxHome: string;
let stdoutChunks: string[];
let stderrChunks: string[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-cli-test-'));
  ctxHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-cli-home-'));
  process.env['CTX_HOME'] = ctxHome;

  // Capture stdout/stderr
  stdoutChunks = [];
  stderrChunks = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdoutChunks.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderrChunks.push(String(chunk));
    return true;
  });

  // Reset exit code
  process.exitCode = undefined;

  // Set up a minimal TS project
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      dependencies: { express: '*' },
      devDependencies: { typescript: '*' },
    }),
  );
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const app = {};');
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(ctxHome, { recursive: true, force: true });
  delete process.env['CTX_HOME'];
  process.exitCode = undefined;
});

function getStdout(): string {
  return stdoutChunks.join('');
}

function getStderr(): string {
  return stderrChunks.join('');
}

// Helper: run CLI with cwd spoofed to tmpDir
async function run(...args: string[]): Promise<void> {
  const origCwd = process.cwd;
  process.cwd = () => tmpDir;
  try {
    await runCli(args);
  } finally {
    process.cwd = origCwd;
  }
}

describe('ctx (default context command)', () => {
  it('outputs a context block', async () => {
    await run();
    const out = getStdout();
    expect(out).toContain('<context>');
    expect(out).toContain('</context>');
    expect(out).toContain('TypeScript');
  });

  it('--compact produces shorter output', async () => {
    await run('--compact');
    const out = getStdout();
    expect(out).toContain('<context>');
    expect(out.split('\n').length).toBeLessThan(10);
  });

  it('--json produces valid JSON', async () => {
    await run('--json');
    const out = getStdout();
    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out) as { project: { stack: { language: string } } };
    expect(parsed.project.stack.language).toBe('TypeScript');
  });

  it('--prompt appends prompt after context', async () => {
    await run('--prompt', 'implement auth');
    const out = getStdout();
    expect(out).toContain('implement auth');
    expect(out.indexOf('</context>')).toBeLessThan(out.indexOf('implement auth'));
  });

  it('--files includes file content', async () => {
    await run('--files', 'src/app.ts');
    const out = getStdout();
    expect(out).toContain('<files>');
    expect(out).toContain('src/app.ts');
    expect(out).toContain('export const app');
  });
});

describe('ctx pref', () => {
  it('set and get global preference', async () => {
    await run('pref', 'set', 'style', 'functional');
    expect(getStdout()).toContain('style = functional');

    stdoutChunks = [];
    await run('pref', 'get', 'style');
    expect(getStdout().trim()).toBe('functional');
  });

  it('list shows global and project sections', async () => {
    await run('pref', 'set', 'style', 'functional');
    stdoutChunks = [];
    await run('pref', 'list');
    const out = getStdout();
    expect(out).toContain('Global:');
    expect(out).toContain('style: functional');
    expect(out).toContain('Project (');
  });

  it('remove deletes a preference', async () => {
    await run('pref', 'set', 'style', 'functional');
    stdoutChunks = [];
    await run('pref', 'remove', 'style');
    expect(getStdout()).toContain('Removed');

    stdoutChunks = [];
    stderrChunks = [];
    await run('pref', 'get', 'style');
    expect(getStderr()).toContain('not found');
  });

  it('get missing key writes to stderr', async () => {
    await run('pref', 'get', 'nonexistent');
    expect(getStderr()).toContain('not found');
    expect(process.exitCode).toBe(1);
  });
});

describe('ctx save / load / profiles / delete', () => {
  it('saves and lists a profile', async () => {
    await run('save', 'my-profile');
    expect(getStdout()).toContain('Saved profile: my-profile');

    stdoutChunks = [];
    await run('profiles');
    expect(getStdout()).toContain('my-profile');
  });

  it('loads a saved profile and outputs context', async () => {
    await run('save', 'my-profile');
    stdoutChunks = [];
    await run('load', 'my-profile');
    const out = getStdout();
    expect(out).toContain('<context>');
    expect(out).toContain('</context>');
  });

  it('deletes a profile', async () => {
    await run('save', 'to-delete');
    stdoutChunks = [];
    await run('delete', 'to-delete');
    expect(getStdout()).toContain('Deleted profile: to-delete');

    stdoutChunks = [];
    stderrChunks = [];
    await run('profiles');
    expect(getStdout()).toContain('No profiles');
  });

  it('load missing profile writes to stderr', async () => {
    await run('load', 'ghost');
    expect(getStderr()).toContain('not found');
    expect(process.exitCode).toBe(1);
  });

  it('profiles shows No profiles when empty', async () => {
    await run('profiles');
    expect(getStdout()).toContain('No profiles');
  });
});
