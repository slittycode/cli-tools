import * as path from 'node:path';
import { Command } from 'commander';
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
import { format, formatRelativeTime } from '../../formatter/Formatter.js';
import {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
} from '../../profiles/Profiles.js';
import type { ContextOutput, ProjectContext } from '../../types.js';

export function createProfileCommands(): {
  saveCmd: Command;
  loadCmd: Command;
  listCmd: Command;
  deleteCmd: Command;
} {
  const saveCmd = new Command('save')
    .argument('<name>', 'profile name')
    .description('save the current context as a named profile')
    .option('--files <paths...>', 'files to include in the profile')
    .option('--notes <text>', 'notes to attach to the profile')
    .action((name: string, options: { files?: string[]; notes?: string }) => {
      try {
        ensureConfigDir();
        const cwd = process.cwd();
        const profile = saveProfile(name, cwd, options.files ?? [], options.notes);
        process.stdout.write(`Saved profile: ${profile.name}\n`);
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  const loadCmd = new Command('load')
    .argument('<name>', 'profile name')
    .description('load and output a saved profile')
    .option('--compact', 'shorter output format')
    .action(async (name: string, options: { compact?: boolean }) => {
      try {
        ensureConfigDir();
        const profile = loadProfile(name);
        if (!profile) {
          process.stderr.write(`ctx: profile not found: ${name}\n`);
          process.exitCode = 1;
          return;
        }

        const projectPath = profile.projectPath;
        const globalConfig = loadGlobalConfig();
        const compact = options.compact ?? globalConfig.defaults.compact;

        const [stack, structure, git] = await Promise.all([
          Promise.resolve(detect(projectPath)),
          Promise.resolve(buildDirectoryStructure(projectPath)),
          getGitStatus(projectPath),
        ]);

        const recentFiles = getRecentFiles(projectPath, globalConfig.defaults.recentFiles);
        const includedFiles =
          profile.files.length > 0
            ? readFiles(projectPath, profile.files, globalConfig.defaults.maxFileSize)
            : [];
        const preferences = loadPreferences(projectPath);

        const project: ProjectContext = {
          name: path.basename(projectPath),
          path: projectPath,
          stack,
          ...(git !== null && { git }),
          structure,
          recentFiles,
          includedFiles,
        };

        const output: ContextOutput = {
          project,
          preferences,
          ...(profile.notes !== undefined && { prompt: profile.notes }),
        };

        process.stdout.write(format(output, compact) + '\n');
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  const listCmd = new Command('profiles')
    .description('list saved profiles')
    .action(() => {
      try {
        ensureConfigDir();
        const profiles = listProfiles();
        if (profiles.length === 0) {
          process.stdout.write('No profiles saved.\n');
          return;
        }
        for (const p of profiles) {
          const age = formatRelativeTime(p.createdAt);
          const projectName = path.basename(p.projectPath);
          process.stdout.write(
            `  ${p.name.padEnd(20)} (${projectName}, saved ${age})\n`,
          );
        }
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  const deleteCmd = new Command('delete')
    .argument('<name>', 'profile name')
    .description('delete a saved profile')
    .action((name: string) => {
      try {
        ensureConfigDir();
        const deleted = deleteProfile(name);
        if (!deleted) {
          process.stderr.write(`ctx: profile not found: ${name}\n`);
          process.exitCode = 1;
        } else {
          process.stdout.write(`Deleted profile: ${name}\n`);
        }
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  return { saveCmd, loadCmd, listCmd, deleteCmd };
}
