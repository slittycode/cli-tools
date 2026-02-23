import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

const BUILD_DIRS = ['dist', 'build', 'out', '.next'];
const SOURCE_DIRS = ['src', 'lib', 'app', 'pages', 'components'];

function newestMtime(dir: string): number {
  let newest = 0;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(fullPath));
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        newest = Math.max(newest, stat.mtimeMs);
      } catch {
        // skip
      }
    }
  }
  return newest;
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const buildFreshnessCheck: Check = {
  name: 'Build',
  async run(root: string): Promise<CheckResult> {
    // Find existing build directory
    let buildDir: string | undefined;
    for (const dir of BUILD_DIRS) {
      const fullPath = path.join(root, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        buildDir = dir;
        break;
      }
    }

    if (!buildDir) {
      return {
        name: this.name,
        status: Status.Skip,
        summary: 'No build dir',
        details: [],
      };
    }

    // Find existing source directory
    let sourceDir: string | undefined;
    for (const dir of SOURCE_DIRS) {
      const fullPath = path.join(root, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        sourceDir = dir;
        break;
      }
    }

    if (!sourceDir) {
      return {
        name: this.name,
        status: Status.Pass,
        summary: `${buildDir}/ present`,
        details: ['No recognised source directory to compare against'],
      };
    }

    const buildTime = newestMtime(path.join(root, buildDir));
    const srcTime = newestMtime(path.join(root, sourceDir));

    if (buildTime === 0) {
      return {
        name: this.name,
        status: Status.Warn,
        summary: `${buildDir}/ empty`,
        details: ['Build directory exists but contains no files'],
      };
    }

    if (srcTime > buildTime) {
      const age = formatAge(srcTime - buildTime);
      return {
        name: this.name,
        status: Status.Warn,
        summary: `Stale (${age})`,
        details: [
          `${sourceDir}/ is newer than ${buildDir}/`,
          'Run a build to update',
        ],
      };
    }

    return {
      name: this.name,
      status: Status.Pass,
      summary: 'Fresh',
      details: [`${buildDir}/ is up to date with ${sourceDir}/`],
    };
  },
};
