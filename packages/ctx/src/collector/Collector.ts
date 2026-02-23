import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore from 'ignore';
import { simpleGit } from 'simple-git';
import type { DirectoryStructure, FileInfo, GitStatus } from '../types.js';

const ALWAYS_EXCLUDE = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.venv', 'venv', 'target', '.next', '.nuxt', 'coverage',
  '.turbo', '.cache',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib', '.a', '.o',
  '.pyc', '.pyo', '.class',
  '.db', '.sqlite', '.sqlite3',
]);

function isBinaryByExtension(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isBinaryByContent(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function isBinaryFile(filePath: string): boolean {
  return isBinaryByExtension(filePath) || isBinaryByContent(filePath);
}

function loadIgnore(projectPath: string): ReturnType<typeof ignore> {
  const ig = ignore();
  const gitignorePath = path.join(projectPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, 'utf8'));
  }
  return ig;
}

interface DirOptions {
  maxDepth?: number;
  maxFiles?: number;
}

function buildTree(
  dirPath: string,
  projectPath: string,
  ig: ReturnType<typeof ignore>,
  depth: number,
  maxDepth: number,
  nodeCount: { value: number },
  maxNodes: number,
): DirectoryStructure {
  const name = path.basename(dirPath);
  const children: (DirectoryStructure | string)[] = [];

  if (nodeCount.value >= maxNodes) return { name, children, fileCount: 0 };

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return { name, children, fileCount: 0 };
  }

  entries.sort((a, b) => {
    // Directories first, then files, both alphabetical
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  let fileCount = 0;
  for (const entry of entries) {
    if (nodeCount.value >= maxNodes) break;
    if (ALWAYS_EXCLUDE.has(entry.name)) continue;

    const relPath = path.relative(projectPath, path.join(dirPath, entry.name));
    if (ig.ignores(entry.isDirectory() ? relPath + '/' : relPath)) continue;

    nodeCount.value++;

    if (entry.isDirectory()) {
      if (depth >= maxDepth) {
        children.push({ name: entry.name, children: [], fileCount: 0 });
      } else {
        const subtree = buildTree(
          path.join(dirPath, entry.name),
          projectPath,
          ig,
          depth + 1,
          maxDepth,
          nodeCount,
          maxNodes,
        );
        children.push(subtree);
      }
    } else if (entry.isFile()) {
      fileCount++;
      children.push(entry.name);
    }
  }

  return { name, children, fileCount };
}

export function buildDirectoryStructure(
  projectPath: string,
  options: DirOptions = {},
): DirectoryStructure {
  const maxDepth = options.maxDepth ?? 5;
  const maxNodes = options.maxFiles ?? 500; // caps files + dirs combined
  const ig = loadIgnore(projectPath);
  const nodeCount = { value: 0 };
  return buildTree(projectPath, projectPath, ig, 0, maxDepth, nodeCount, maxNodes);
}

export async function getGitStatus(projectPath: string): Promise<GitStatus | null> {
  const TIMEOUT_MS = 300;
  const git = simpleGit(projectPath);

  const gitOp = async (): Promise<GitStatus | null> => {
    try {
      const [branchResult, statusResult] = await Promise.all([
        git.branchLocal(),
        git.status(),
      ]);
      const uncommittedCount =
        statusResult.modified.length +
        statusResult.not_added.length +
        statusResult.staged.length +
        statusResult.deleted.length +
        statusResult.renamed.length;
      return {
        branch: branchResult.current ?? 'HEAD',
        clean: statusResult.isClean(),
        uncommittedCount,
      };
    } catch {
      return null;
    }
  };

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
  return Promise.race([gitOp(), timeout]);
}

const MAX_RECENT_SCAN = 2000; // max files inspected before stopping walk
const MAX_RECENT_DEPTH = 6;   // max directory depth to walk

export function getRecentFiles(projectPath: string, count: number): FileInfo[] {
  const ig = loadIgnore(projectPath);
  const files: FileInfo[] = [];
  const scanned = { value: 0 };

  function walk(dirPath: string, depth: number): void {
    if (scanned.value >= MAX_RECENT_SCAN) return;
    if (depth > MAX_RECENT_DEPTH) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (scanned.value >= MAX_RECENT_SCAN) return;
      if (ALWAYS_EXCLUDE.has(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.relative(projectPath, fullPath);
      if (ig.ignores(entry.isDirectory() ? relPath + '/' : relPath)) continue;

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && !isBinaryByExtension(fullPath)) {
        scanned.value++;
        try {
          const stat = fs.statSync(fullPath);
          files.push({
            path: fullPath,
            relativePath: relPath,
            size: stat.size,
            modifiedAt: stat.mtime,
          });
        } catch {
          // skip files we can't stat
        }
      }
    }
  }

  walk(projectPath, 0);
  files.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  return files.slice(0, count);
}

export function readFiles(
  projectPath: string,
  patterns: string[],
  maxFileSize = 10000,
): FileInfo[] {
  const results: FileInfo[] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    let matches: string[];
    try {
      matches = fs.globSync(pattern, { cwd: projectPath });
    } catch {
      continue;
    }

    for (const match of matches) {
      const fullPath = path.resolve(projectPath, match);
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      if (isBinaryFile(fullPath)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        process.stderr.write(`ctx: permission denied or missing: ${match}\n`);
        continue;
      }

      let content: string;
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        if (raw.length > maxFileSize) {
          content = raw.slice(0, maxFileSize) + `\n[truncated - ${raw.length} bytes]`;
        } else {
          content = raw;
        }
      } catch {
        process.stderr.write(`ctx: could not read: ${match}\n`);
        continue;
      }

      results.push({
        path: fullPath,
        relativePath: path.relative(projectPath, fullPath),
        size: stat.size,
        modifiedAt: stat.mtime,
        content,
      });
    }
  }

  return results;
}
