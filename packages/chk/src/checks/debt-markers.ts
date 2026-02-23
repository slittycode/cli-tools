import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

const MARKERS = /\b(TODO|FIXME|HACK|XXX)\b/;

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib', '.o',
  '.pyc', '.class', '.db', '.sqlite', '.sqlite3',
  '.lock', '.lockb',
]);

const ALWAYS_SKIP = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.venv', 'venv', 'target', '.next', '.nuxt',
  'coverage', '.turbo', '.cache', 'vendor',
]);

interface MarkerHit {
  file: string;
  line: number;
  marker: string;
  text: string;
}

function loadGitignore(root: string): ReturnType<typeof ignore> {
  const ig = ignore();
  const gitignorePath = path.join(root, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    ig.add(content);
  }
  return ig;
}

function walkFiles(dir: string, root: string, ig: ReturnType<typeof ignore>): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (ALWAYS_SKIP.has(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath);

    if (ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, root, ig));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXT.has(ext)) continue;
      results.push(fullPath);
    }
  }
  return results;
}

export const debtMarkersCheck: Check = {
  name: 'Debt Markers',
  async run(root: string): Promise<CheckResult> {
    const ig = loadGitignore(root);
    const files = walkFiles(root, root, ig);
    const hits: MarkerHit[] = [];

    for (const filePath of files) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i]?.match(MARKERS);
        if (match) {
          hits.push({
            file: path.relative(root, filePath),
            line: i + 1,
            marker: match[1]!,
            text: (lines[i] ?? '').trim().slice(0, 80),
          });
        }
      }
      // Cap scanning at a reasonable limit
      if (hits.length > 200) break;
    }

    const details = hits.map((h) => `${h.marker} ${h.file}:${h.line}`);
    const count = hits.length;

    if (count === 0) {
      return { name: this.name, status: Status.Pass, summary: 'None found', details };
    }
    if (count <= 10) {
      return { name: this.name, status: Status.Warn, summary: `${count} found`, details };
    }
    return { name: this.name, status: Status.Fail, summary: `${count} found`, details };
  },
};
