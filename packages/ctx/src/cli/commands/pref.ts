import * as path from 'node:path';
import { Command } from 'commander';
import {
  ensureConfigDir,
  loadGlobalConfig,
  loadProjectConfig,
  saveGlobalConfig,
  saveProjectConfig,
} from '../../config/Config.js';

export function createPrefCommand(): Command {
  const pref = new Command('pref').description('manage preferences');

  pref
    .command('set <key> <value>')
    .description('set a preference')
    .option('--project', 'set at project level instead of global')
    .action((key: string, value: string, options: { project?: boolean }) => {
      try {
        ensureConfigDir();
        if (options.project) {
          const cwd = process.cwd();
          const existing = loadProjectConfig(cwd)?.preferences ?? {};
          existing[key] = value;
          saveProjectConfig(cwd, existing);
          process.stdout.write(`Set project preference: ${key} = ${value}\n`);
        } else {
          const config = loadGlobalConfig();
          config.preferences[key] = value;
          saveGlobalConfig(config);
          process.stdout.write(`Set global preference: ${key} = ${value}\n`);
        }
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  pref
    .command('get <key>')
    .description('print the value of a preference')
    .action((key: string) => {
      try {
        ensureConfigDir();
        const cwd = process.cwd();
        const projectPrefs = loadProjectConfig(cwd)?.preferences ?? {};
        const globalPrefs = loadGlobalConfig().preferences;
        const value = projectPrefs[key] ?? globalPrefs[key];
        if (value === undefined) {
          process.stderr.write(`ctx: preference not found: ${key}\n`);
          process.exitCode = 1;
        } else {
          process.stdout.write(`${value}\n`);
        }
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  pref
    .command('list')
    .description('list all preferences')
    .action(() => {
      try {
        ensureConfigDir();
        const cwd = process.cwd();
        const globalPrefs = loadGlobalConfig().preferences;
        const projectPrefs = loadProjectConfig(cwd)?.preferences ?? {};
        const projectName = path.basename(cwd);

        const lines: string[] = ['Global:'];
        if (Object.keys(globalPrefs).length === 0) {
          lines.push('  (none)');
        } else {
          for (const [k, v] of Object.entries(globalPrefs)) {
            lines.push(`  ${k}: ${v}`);
          }
        }

        lines.push(`\nProject (${projectName}):`);
        if (Object.keys(projectPrefs).length === 0) {
          lines.push('  (none)');
        } else {
          for (const [k, v] of Object.entries(projectPrefs)) {
            lines.push(`  ${k}: ${v}`);
          }
        }

        process.stdout.write(lines.join('\n') + '\n');
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  pref
    .command('remove <key>')
    .description('remove a preference')
    .option('--project', 'remove from project level instead of global')
    .action((key: string, options: { project?: boolean }) => {
      try {
        ensureConfigDir();
        if (options.project) {
          const cwd = process.cwd();
          const existing = loadProjectConfig(cwd)?.preferences ?? {};
          if (!(key in existing)) {
            process.stderr.write(`ctx: preference not found: ${key}\n`);
            process.exitCode = 1;
            return;
          }
          const { [key]: _, ...rest } = existing;
          saveProjectConfig(cwd, rest);
          process.stdout.write(`Removed project preference: ${key}\n`);
        } else {
          const config = loadGlobalConfig();
          if (!(key in config.preferences)) {
            process.stderr.write(`ctx: preference not found: ${key}\n`);
            process.exitCode = 1;
            return;
          }
          const { [key]: _, ...rest } = config.preferences;
          config.preferences = rest;
          saveGlobalConfig(config);
          process.stdout.write(`Removed global preference: ${key}\n`);
        }
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  return pref;
}
