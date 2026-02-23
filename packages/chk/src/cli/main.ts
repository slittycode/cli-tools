import { Command } from 'commander';
import * as path from 'path';
import { allChecks } from '../checks/index.js';
import { runChecks } from '../runner.js';
import { renderCard, renderJson } from '../renderer.js';

const program = new Command();

program
  .name('chk')
  .description('Project health check — traffic-light assessment at a glance')
  .version('0.1.0')
  .option('--verbose', 'show detail lines for each check', false)
  .option('--json', 'output results as JSON', false)
  .option('--skip <checks...>', 'skip specific checks by name')
  .action(async (opts) => {
    const root = process.cwd();
    const skip: string[] = opts.skip ?? [];
    const result = await runChecks(allChecks, root, skip);

    if (opts.json) {
      console.log(renderJson(result));
    } else {
      console.log(renderCard(result, opts.verbose));
    }
  });

program.parse();
