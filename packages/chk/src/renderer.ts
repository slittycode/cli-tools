import chalk from 'chalk';
import * as path from 'path';
import { Status } from './types.js';
import type { RunnerResult } from './runner.js';

const STATUS_ICON: Record<Status, string> = {
  [Status.Pass]: chalk.green('✔'),
  [Status.Warn]: chalk.yellow('▲'),
  [Status.Fail]: chalk.red('✖'),
  [Status.Skip]: chalk.dim('○'),
};

const STATUS_COLOR: Record<Status, (s: string) => string> = {
  [Status.Pass]: chalk.green,
  [Status.Warn]: chalk.yellow,
  [Status.Fail]: chalk.red,
  [Status.Skip]: chalk.dim,
};

const BOX_WIDTH = 48;

function pad(text: string, width: number): string {
  const visible = stripAnsi(text);
  const diff = width - visible.length;
  return diff > 0 ? text + ' '.repeat(diff) : text;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

function line(left: string, right: string, indent = 3): string {
  const innerWidth = BOX_WIDTH - 2; // inside the box borders
  const leftPart = ' '.repeat(indent) + left;
  const leftVisible = stripAnsi(leftPart).length;
  const rightVisible = stripAnsi(right).length;
  const gap = innerWidth - leftVisible - rightVisible;
  if (gap < 1) {
    return chalk.dim('│') + leftPart + ' ' + right + chalk.dim('│');
  }
  return chalk.dim('│') + leftPart + ' '.repeat(gap) + right + chalk.dim('│');
}

function border(char: '┌' | '├' | '└', fill = '─'): string {
  const end = char === '┌' ? '┐' : char === '├' ? '┤' : '┘';
  return chalk.dim(char + fill.repeat(BOX_WIDTH - 2) + end);
}

function emptyLine(): string {
  return chalk.dim('│') + ' '.repeat(BOX_WIDTH - 2) + chalk.dim('│');
}

export function renderCard(result: RunnerResult, verbose: boolean): string {
  const lines: string[] = [];
  const dirName = result.root.replace(/^\/Users\/[^/]+/, '~');

  // Header
  lines.push('');
  lines.push(' ' + border('┌'));
  lines.push(' ' + line(chalk.bold.white('CHK') + chalk.dim(' · Project Health'), '', 2));
  lines.push(' ' + line(chalk.dim(truncate(dirName, BOX_WIDTH - 6)), '', 2));
  lines.push(' ' + border('├'));

  // Check results
  for (const r of result.results) {
    const icon = STATUS_ICON[r.status];
    const name = pad(STATUS_COLOR[r.status](r.name), 20);
    const summary = truncate(r.summary, 18);
    lines.push(' ' + line(`${icon}  ${name}`, chalk.dim(summary), 1));

    if (verbose && r.details.length > 0) {
      for (const d of r.details.slice(0, 15)) {
        lines.push(' ' + line(chalk.dim('   ' + truncate(d, BOX_WIDTH - 12)), '', 3));
      }
      if (r.details.length > 15) {
        lines.push(' ' + line(chalk.dim(`   … and ${r.details.length - 15} more`), '', 3));
      }
    }
  }

  // Summary
  lines.push(' ' + border('├'));
  const { pass, warn, fail } = result.counts;
  const total = result.results.filter((r) => r.status !== Status.Skip).length;
  const parts: string[] = [];
  parts.push(chalk.green(`${pass}/${total} passing`));
  if (warn > 0) parts.push(chalk.yellow(`${warn} warning${warn > 1 ? 's' : ''}`));
  if (fail > 0) parts.push(chalk.red(`${fail} fail${fail > 1 ? 's' : ''}`));
  lines.push(' ' + line(parts.join(chalk.dim(' · ')), '', 2));
  lines.push(' ' + border('└'));
  lines.push('');

  return lines.join('\n');
}

export function renderJson(result: RunnerResult): string {
  return JSON.stringify(
    {
      root: result.root,
      results: result.results,
      summary: result.counts,
    },
    null,
    2,
  );
}
