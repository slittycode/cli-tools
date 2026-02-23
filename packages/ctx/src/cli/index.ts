import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { type ContextOptions, runContext } from './commands/context.js';
import { createPrefCommand } from './commands/pref.js';
import { createProfileCommands } from './commands/profile.js';
import { runSync } from './commands/sync.js';

function getVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

export async function runCli(args: string[]): Promise<number> {
  const program = new Command();

  program
    .name('ctx')
    .description('Capture project context for AI tools')
    .version(getVersion())
    // Default (context) options
    .option('--files <paths...>', 'include file contents in context')
    .option('--recent <n>', 'include n most recently modified files')
    .option('--compact', 'shorter output format')
    .option('--copy', 'copy output to clipboard')
    .option('--prompt <text>', 'append a prompt after the context block')
    .option('--json', 'output as JSON')
    .action(async (options: ContextOptions) => {
      try {
        await runContext(options);
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  // Preferences subcommand
  program.addCommand(createPrefCommand());

  // Sync: write compact .ctx to git root for universal agent injection
  program
    .command('sync')
    .description('write compact context to .ctx file in git root')
    .action(async () => {
      try {
        await runSync();
      } catch (err) {
        process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exitCode = 1;
      }
    });

  // Profile subcommands (all registered at top level per SPEC)
  const { saveCmd, loadCmd, listCmd, deleteCmd } = createProfileCommands();
  program.addCommand(saveCmd);
  program.addCommand(loadCmd);
  program.addCommand(listCmd);
  program.addCommand(deleteCmd);

  try {
    await program.parseAsync(args, { from: 'user' });
  } catch (err) {
    process.stderr.write(`ctx: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }

  const code = process.exitCode;
  return typeof code === 'number' ? code : 0;
}
