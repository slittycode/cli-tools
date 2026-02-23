import * as path from 'node:path';
import * as fs from 'node:fs';
import { simpleGit } from 'simple-git';
import {
  buildDirectoryStructure,
  getGitStatus,
} from '../../collector/Collector.js';
import {
  ensureConfigDir,
  loadGlobalConfig,
  loadPreferences,
} from '../../config/Config.js';
import { detect } from '../../detector/Detector.js';
import { format } from '../../formatter/Formatter.js';
import type { ContextOutput, ProjectContext } from '../../types.js';

async function resolveProjectRoot(cwd: string): Promise<string> {
  try {
    const git = simpleGit(cwd);
    const root = await git.revparse(['--show-toplevel']);
    return root.trim();
  } catch {
    return cwd;
  }
}

export async function runSync(cwd = process.cwd()): Promise<void> {
  ensureConfigDir();
  loadGlobalConfig(); // ensure config dir exists, apply defaults

  const projectPath = await resolveProjectRoot(cwd);

  const [stack, structure, git] = await Promise.all([
    Promise.resolve(detect(projectPath)),
    Promise.resolve(buildDirectoryStructure(projectPath)),
    getGitStatus(projectPath),
  ]);

  const preferences = loadPreferences(projectPath);

  const project: ProjectContext = {
    name: path.basename(projectPath),
    path: projectPath,
    stack,
    ...(git !== null && { git }),
    structure,
    recentFiles: [],
    includedFiles: [],
  };

  const output: ContextOutput = {
    project,
    preferences,
  };

  const result = format(output, true); // always compact for .ctx file

  const outPath = path.join(projectPath, '.ctx');
  fs.writeFileSync(outPath, result, 'utf8');
  process.stderr.write(`ctx: synced → ${outPath}\n`);
}
