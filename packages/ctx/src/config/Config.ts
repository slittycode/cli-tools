import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ConfigFile, Preferences, ProjectConfigFile } from '../types.js';

export function getConfigDir(): string {
  return process.env['CTX_HOME'] ?? path.join(os.homedir(), '.ctx');
}

export function ensureConfigDir(): void {
  const base = getConfigDir();
  fs.mkdirSync(base, { recursive: true });
  fs.mkdirSync(path.join(base, 'profiles'), { recursive: true });
  fs.mkdirSync(path.join(base, 'projects'), { recursive: true });
}

const DEFAULT_CONFIG: ConfigFile = {
  version: 1,
  preferences: {},
  defaults: {
    compact: false,
    recentFiles: 3,
    maxFileSize: 10000,
  },
};

export function loadGlobalConfig(): ConfigFile {
  const configPath = path.join(getConfigDir(), 'config.json');
  if (!fs.existsSync(configPath)) {
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ConfigFile>;
    return {
      version: parsed.version ?? DEFAULT_CONFIG.version,
      preferences: parsed.preferences ?? {},
      defaults: {
        compact: parsed.defaults?.compact ?? DEFAULT_CONFIG.defaults.compact,
        recentFiles: parsed.defaults?.recentFiles ?? DEFAULT_CONFIG.defaults.recentFiles,
        maxFileSize: parsed.defaults?.maxFileSize ?? DEFAULT_CONFIG.defaults.maxFileSize,
      },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveGlobalConfig(config: ConfigFile): void {
  ensureConfigDir();
  const configPath = path.join(getConfigDir(), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function projectHash(projectPath: string): string {
  const resolved = path.resolve(projectPath);
  return crypto.createHash('sha1').update(resolved).digest('hex').slice(0, 16);
}

export function loadProjectConfig(projectPath: string): ProjectConfigFile | null {
  const hash = projectHash(projectPath);
  const configPath = path.join(getConfigDir(), 'projects', `${hash}.json`);
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as ProjectConfigFile;
  } catch {
    return null;
  }
}

export function saveProjectConfig(projectPath: string, preferences: Record<string, string>): void {
  ensureConfigDir();
  const hash = projectHash(projectPath);
  const configPath = path.join(getConfigDir(), 'projects', `${hash}.json`);
  const config: ProjectConfigFile = {
    projectPath: path.resolve(projectPath),
    preferences,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export function loadPreferences(projectPath: string): Preferences {
  const global = loadGlobalConfig().preferences;
  const project = loadProjectConfig(projectPath)?.preferences ?? {};
  return { global, project };
}
