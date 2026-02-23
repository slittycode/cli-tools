import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
  validateProfileName,
} from './Profiles.js';
import { ensureConfigDir } from '../config/Config.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-profiles-test-'));
  process.env['CTX_HOME'] = tmpDir;
  ensureConfigDir();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env['CTX_HOME'];
});

describe('validateProfileName', () => {
  it('accepts valid names', () => {
    expect(() => validateProfileName('my-profile')).not.toThrow();
    expect(() => validateProfileName('my_profile123')).not.toThrow();
    expect(() => validateProfileName('ABC')).not.toThrow();
  });

  it('rejects names with spaces', () => {
    expect(() => validateProfileName('my profile')).toThrow();
  });

  it('rejects path traversal', () => {
    expect(() => validateProfileName('../evil')).toThrow();
    expect(() => validateProfileName('../../etc/passwd')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => validateProfileName('')).toThrow();
  });

  it('rejects special characters', () => {
    expect(() => validateProfileName('foo@bar')).toThrow();
  });
});

describe('saveProfile / loadProfile round-trip', () => {
  it('persists and retrieves a profile', () => {
    saveProfile('my-profile', '/code/project', ['src/types.ts'], 'working on types');
    const loaded = loadProfile('my-profile');
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('my-profile');
    expect(loaded?.projectPath).toBe('/code/project');
    expect(loaded?.files).toEqual(['src/types.ts']);
    expect(loaded?.notes).toBe('working on types');
    expect(loaded?.createdAt).toBeInstanceOf(Date);
  });

  it('saves profile without notes', () => {
    saveProfile('no-notes', '/code/project', []);
    const loaded = loadProfile('no-notes');
    expect(loaded?.notes).toBeUndefined();
  });

  it('returns null for non-existent profile', () => {
    expect(loadProfile('nonexistent')).toBeNull();
  });

  it('returns null for invalid name', () => {
    expect(() => loadProfile('../evil')).toThrow();
  });
});

describe('listProfiles', () => {
  it('returns empty array when no profiles exist', () => {
    expect(listProfiles()).toEqual([]);
  });

  it('returns all saved profiles', () => {
    saveProfile('alpha', '/code/a', []);
    saveProfile('beta', '/code/b', []);
    const profiles = listProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.map((p) => p.name)).toContain('alpha');
    expect(profiles.map((p) => p.name)).toContain('beta');
  });

  it('sorts by createdAt descending', () => {
    saveProfile('first', '/code/a', []);
    // Nudge the second profile to be 5ms newer
    const before = Date.now();
    while (Date.now() <= before) { /* spin */ }
    saveProfile('second', '/code/b', []);
    const profiles = listProfiles();
    expect(profiles[0]?.name).toBe('second');
    expect(profiles[1]?.name).toBe('first');
  });
});

describe('deleteProfile', () => {
  it('deletes an existing profile and returns true', () => {
    saveProfile('to-delete', '/code/p', []);
    expect(deleteProfile('to-delete')).toBe(true);
    expect(loadProfile('to-delete')).toBeNull();
  });

  it('returns false for non-existent profile', () => {
    expect(deleteProfile('ghost')).toBe(false);
  });

  it('throws for invalid name', () => {
    expect(() => deleteProfile('../evil')).toThrow();
  });
});
