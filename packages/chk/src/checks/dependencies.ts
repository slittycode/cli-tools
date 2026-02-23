import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

interface PackageManager {
  name: string;
  lockFile: string;
  installDir: string;
}

const MANAGERS: PackageManager[] = [
  { name: 'npm', lockFile: 'package-lock.json', installDir: 'node_modules' },
  { name: 'yarn', lockFile: 'yarn.lock', installDir: 'node_modules' },
  { name: 'pnpm', lockFile: 'pnpm-lock.yaml', installDir: 'node_modules' },
  { name: 'bun', lockFile: 'bun.lock', installDir: 'node_modules' },
  { name: 'pip', lockFile: 'Pipfile.lock', installDir: '.venv' },
  { name: 'pip', lockFile: 'requirements.txt', installDir: '.venv' },
  { name: 'cargo', lockFile: 'Cargo.lock', installDir: 'target' },
  { name: 'go', lockFile: 'go.sum', installDir: '' },
  { name: 'composer', lockFile: 'composer.lock', installDir: 'vendor' },
];

export const dependenciesCheck: Check = {
  name: 'Dependencies',
  async run(root: string): Promise<CheckResult> {
    const details: string[] = [];
    let detected: PackageManager | undefined;

    for (const mgr of MANAGERS) {
      if (fs.existsSync(path.join(root, mgr.lockFile))) {
        detected = mgr;
        details.push(`Lock file: ${mgr.lockFile} (${mgr.name})`);
        break;
      }
    }

    // Also check for manifest files without lock files
    const manifests = ['package.json', 'Pipfile', 'Cargo.toml', 'go.mod', 'composer.json'];
    let hasManifest = false;
    for (const m of manifests) {
      if (fs.existsSync(path.join(root, m))) {
        hasManifest = true;
        if (!detected) {
          details.push(`Manifest: ${m} (no lock file)`);
        }
        break;
      }
    }

    if (!detected && !hasManifest) {
      return {
        name: this.name,
        status: Status.Skip,
        summary: 'No package manager',
        details,
      };
    }

    if (!detected) {
      return {
        name: this.name,
        status: Status.Fail,
        summary: 'No lock file',
        details: [...details, 'Manifest found but no lock file — run install'],
      };
    }

    // Check if install directory exists
    if (detected.installDir) {
      const installPath = path.join(root, detected.installDir);
      if (fs.existsSync(installPath)) {
        return {
          name: this.name,
          status: Status.Pass,
          summary: `${detected.name} · installed`,
          details,
        };
      }
      return {
        name: this.name,
        status: Status.Warn,
        summary: `${detected.name} · not installed`,
        details: [...details, `${detected.installDir}/ not found — run install`],
      };
    }

    // For Go, just having go.sum is good enough
    return {
      name: this.name,
      status: Status.Pass,
      summary: `${detected.name} · locked`,
      details,
    };
  },
};
