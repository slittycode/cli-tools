import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ensureConfigDir,
  getConfigDir,
  loadGlobalConfig,
  loadPreferences,
  loadProjectConfig,
  projectHash,
  saveGlobalConfig,
  saveProjectConfig,
} from './Config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-test-'));
  process.env['CTX_HOME'] = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env['CTX_HOME'];
});

describe('getConfigDir', () => {
  it('returns CTX_HOME when set', () => {
    expect(getConfigDir()).toBe(tmpDir);
  });

  it('returns ~/.ctx when CTX_HOME not set', () => {
    delete process.env['CTX_HOME'];
    expect(getConfigDir()).toBe(path.join(os.homedir(), '.ctx'));
    process.env['CTX_HOME'] = tmpDir;
  });
});

describe('ensureConfigDir', () => {
  it('creates config dir, profiles/, and projects/', () => {
    ensureConfigDir();
    expect(fs.existsSync(tmpDir)).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'profiles'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'projects'))).toBe(true);
  });

  it('is idempotent', () => {
    ensureConfigDir();
    expect(() => ensureConfigDir()).not.toThrow();
  });
});

describe('loadGlobalConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const config = loadGlobalConfig();
    expect(config.version).toBe(1);
    expect(config.preferences).toEqual({});
    expect(config.defaults.compact).toBe(false);
    expect(config.defaults.recentFiles).toBe(3);
    expect(config.defaults.maxFileSize).toBe(10000);
  });

  it('returns defaults when config file is invalid JSON', () => {
    ensureConfigDir();
    fs.writeFileSync(path.join(tmpDir, 'config.json'), 'not json', 'utf8');
    const config = loadGlobalConfig();
    expect(config.preferences).toEqual({});
  });
});

describe('saveGlobalConfig / loadGlobalConfig round-trip', () => {
  it('persists and retrieves config', () => {
    ensureConfigDir();
    saveGlobalConfig({
      version: 1,
      preferences: { style: 'functional' },
      defaults: { compact: true, recentFiles: 5, maxFileSize: 20000 },
    });
    const loaded = loadGlobalConfig();
    expect(loaded.preferences['style']).toBe('functional');
    expect(loaded.defaults.compact).toBe(true);
    expect(loaded.defaults.recentFiles).toBe(5);
  });
});

describe('projectHash', () => {
  it('returns a 16-char hex string', () => {
    const hash = projectHash('/some/project/path');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic', () => {
    expect(projectHash('/foo/bar')).toBe(projectHash('/foo/bar'));
  });

  it('differs for different paths', () => {
    expect(projectHash('/foo/bar')).not.toBe(projectHash('/foo/baz'));
  });
});

describe('saveProjectConfig / loadProjectConfig round-trip', () => {
  it('persists and retrieves project preferences', () => {
    ensureConfigDir();
    saveProjectConfig('/my/project', { constraints: 'local-first' });
    const loaded = loadProjectConfig('/my/project');
    expect(loaded?.preferences['constraints']).toBe('local-first');
    expect(loaded?.projectPath).toBe('/my/project');
  });

  it('returns null when no project config exists', () => {
    ensureConfigDir();
    expect(loadProjectConfig('/nonexistent/path')).toBeNull();
  });
});

describe('loadPreferences', () => {
  it('merges global and project prefs', () => {
    ensureConfigDir();
    saveGlobalConfig({
      version: 1,
      preferences: { style: 'functional' },
      defaults: { compact: false, recentFiles: 3, maxFileSize: 10000 },
    });
    saveProjectConfig('/my/project', { db: 'sqlite' });
    const prefs = loadPreferences('/my/project');
    expect(prefs.global['style']).toBe('functional');
    expect(prefs.project['db']).toBe('sqlite');
  });

  it('returns empty records when no config exists', () => {
    const prefs = loadPreferences('/no/config/here');
    expect(prefs.global).toEqual({});
    expect(prefs.project).toEqual({});
  });
});
