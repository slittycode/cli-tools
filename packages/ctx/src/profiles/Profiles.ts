import * as fs from 'node:fs';
import * as path from 'node:path';
import { getConfigDir } from '../config/Config.js';
import type { Profile } from '../types.js';

const VALID_NAME = /^[a-zA-Z0-9_-]+$/;

export function validateProfileName(name: string): void {
  if (!VALID_NAME.test(name)) {
    throw new Error(
      `Invalid profile name "${name}". Use only letters, numbers, hyphens, and underscores.`,
    );
  }
}

function profilePath(name: string): string {
  return path.join(getConfigDir(), 'profiles', `${name}.json`);
}

interface StoredProfile {
  name: string;
  projectPath: string;
  files: string[];
  notes?: string;
  createdAt: string; // ISO string on disk
}

export function saveProfile(
  name: string,
  projectPath: string,
  files: string[],
  notes?: string,
): Profile {
  validateProfileName(name);
  const profile: Profile = {
    name,
    projectPath,
    files,
    ...(notes !== undefined && { notes }),
    createdAt: new Date(),
  };
  const stored: StoredProfile = {
    name: profile.name,
    projectPath: profile.projectPath,
    files: profile.files,
    ...(profile.notes !== undefined && { notes: profile.notes }),
    createdAt: profile.createdAt.toISOString(),
  };
  fs.writeFileSync(profilePath(name), JSON.stringify(stored, null, 2), 'utf8');
  return profile;
}

export function loadProfile(name: string): Profile | null {
  validateProfileName(name);
  const p = profilePath(name);
  if (!fs.existsSync(p)) return null;
  try {
    const stored = JSON.parse(fs.readFileSync(p, 'utf8')) as StoredProfile;
    return {
      name: stored.name,
      projectPath: stored.projectPath,
      files: stored.files,
      ...(stored.notes !== undefined && { notes: stored.notes }),
      createdAt: new Date(stored.createdAt),
    };
  } catch {
    return null;
  }
}

export function listProfiles(): Profile[] {
  const dir = path.join(getConfigDir(), 'profiles');
  if (!fs.existsSync(dir)) return [];

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const profiles: Profile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const name = entry.slice(0, -5);
    if (!VALID_NAME.test(name)) continue;
    const profile = loadProfile(name);
    if (profile) profiles.push(profile);
  }

  profiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return profiles;
}

export function deleteProfile(name: string): boolean {
  validateProfileName(name);
  const p = profilePath(name);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}
