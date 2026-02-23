import * as path from 'node:path';
import {
  buildDirectoryStructure,
  getGitStatus,
  getRecentFiles,
  readFiles,
} from '../../collector/Collector.js';
import {
  ensureConfigDir,
  loadGlobalConfig,
  loadPreferences,
} from '../../config/Config.js';
import { detect } from '../../detector/Detector.js';
import { format, formatJson } from '../../formatter/Formatter.js';
import type { ContextOutput, ProjectContext } from '../../types.js';

export interface ContextOptions {
  files?: string[];
  recent?: string;
  compact?: boolean;
  copy?: boolean;
  prompt?: string;
  json?: boolean;
}

export async function runContext(options: ContextOptions, cwd = process.cwd()): Promise<void> {
  ensureConfigDir();

  const globalConfig = loadGlobalConfig();
  const compact = options.compact ?? globalConfig.defaults.compact;
  const recentCount =
    options.recent !== undefined
      ? Math.max(0, parseInt(options.recent, 10))
      : globalConfig.defaults.recentFiles;
  const maxFileSize = globalConfig.defaults.maxFileSize;

  const [stack, structure, git] = await Promise.all([
    Promise.resolve(detect(cwd)),
    Promise.resolve(buildDirectoryStructure(cwd)),
    getGitStatus(cwd),
  ]);

  const recentFiles = recentCount > 0 ? getRecentFiles(cwd, recentCount) : [];
  const includedFiles =
    options.files && options.files.length > 0
      ? readFiles(cwd, options.files, maxFileSize)
      : [];

  const preferences = loadPreferences(cwd);

  const project: ProjectContext = {
    name: path.basename(cwd),
    path: cwd,
    stack,
    ...(git !== null && { git }),
    structure,
    recentFiles,
    includedFiles,
  };

  const output: ContextOutput = {
    project,
    preferences,
    ...(options.prompt !== undefined && { prompt: options.prompt }),
  };

  const result = options.json ? formatJson(output) : format(output, compact);

  if (options.copy) {
    const { default: clipboard } = await import('clipboardy');
    await clipboard.write(result);
    process.stderr.write('ctx: Copied to clipboard\n');
  } else {
    process.stdout.write(result + '\n');
  }
}
