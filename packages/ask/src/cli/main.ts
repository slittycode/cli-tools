#!/usr/bin/env node
/**
 * ask — universal AI prompt dispatcher
 *
 * Routes a prompt to your preferred available AI agent, automatically
 * injecting project context via `ctx` so you never re-explain your stack.
 *
 * Usage:
 *   ask "explain this error" < error.log
 *   cat src/auth.ts | ask "what's wrong here?"
 *   ask --agent ollama:qwen2.5 "translate this to Python"
 *   ask --all "is this pattern safe?" < code.ts
 *   ask --status
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { CLIOptions } from '../types.js';
import { detectAgents } from '../detect.js';
import { resolveAgent, resolveAllAgents } from '../router.js';
import { buildPrompt } from '../context.js';
import {
  printStatus,
  printAgentHeader,
  printRouting,
  printDivider,
  writeChunk,
  printStreamEnd,
  printAgentError,
  printNoPrompt,
} from '../renderer.js';

async function readStdin(): Promise<string> {
  // Only attempt to read stdin if it's a pipe/file (not a TTY)
  if (process.stdin.isTTY) return '';

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk as Buffer));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').trim()));
    process.stdin.on('error', () => resolve(''));
  });
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('ask')
    .description('Universal AI prompt dispatcher')
    .version('0.1.0')
    .argument('[prompt]', 'Prompt to send (also reads from stdin)')
    .option('-a, --agent <id[:model]>', 'Pin to a specific agent, e.g. ollama:qwen2.5')
    .option('--all', 'Query all available agents', false)
    .option('--status', 'Show agent availability and exit', false)
    .option('--no-context', 'Skip ctx project context injection')
    .option('-s, --system <text>', 'Override system prompt')
    .parse(process.argv);

  const opts = program.opts();
  const args = program.args;

  const options: CLIOptions = {
    prompt: args[0],
    agent: opts.agent as string | undefined,
    all: opts.all as boolean,
    status: opts.status as boolean,
    noContext: !opts.context, // commander turns --no-context into opts.context = false
    system: opts.system as string | undefined,
  };

  // ── Status mode ───────────────────────────────────────────────────────────
  if (options.status) {
    const agents = await detectAgents();
    printStatus(agents);
    return;
  }

  // ── Collect prompt from args + stdin ─────────────────────────────────────
  const stdinContent = await readStdin();
  let rawPrompt = options.prompt ?? '';

  if (stdinContent) {
    rawPrompt = rawPrompt
      ? `${rawPrompt}\n\n${stdinContent}`
      : stdinContent;
  }

  if (!rawPrompt.trim()) {
    printNoPrompt();
    process.exit(1);
  }

  // ── Build final prompt (with optional ctx context) ────────────────────────
  const prompt = buildPrompt(rawPrompt, {
    injectContext: !options.noContext,
  });

  const askOpts = {
    system: options.system,
    stream: true,
  };

  // ── --all mode: query every available agent sequentially ──────────────────
  if (options.all) {
    const agents = await resolveAllAgents();

    if (agents.length === 0) {
      process.stderr.write('No agents available. Run `ask --status` for details.\n');
      process.exit(1);
    }

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      printAgentHeader(agent.info);

      try {
        for await (const chunk of agent.ask(prompt, askOpts)) {
          writeChunk(chunk);
        }
        printStreamEnd();
      } catch (err) {
        printAgentError(agent.info, err);
      }

      if (i < agents.length - 1) {
        printDivider();
      }
    }

    return;
  }

  // ── Single-agent mode ─────────────────────────────────────────────────────
  try {
    const agent = await resolveAgent(options.agent);
    printRouting(agent.info);

    for await (const chunk of agent.ask(prompt, askOpts)) {
      writeChunk(chunk);
    }
    printStreamEnd();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\nError: ${msg}\n`);
    process.exit(1);
  }
}

main();
