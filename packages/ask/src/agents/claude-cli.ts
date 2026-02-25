/**
 * Claude Code CLI agent
 * Spawns the `claude` binary and streams its stdout.
 *
 * Invocation: `claude -p "<prompt>"` (non-interactive mode)
 * Docs: https://docs.anthropic.com/en/docs/claude-code/cli-reference
 */

import { spawn } from 'child_process';
import { Agent, AgentInfo, AskOptions } from '../types.js';

export class ClaudeCliAgent implements Agent {
  info: AgentInfo;

  constructor(info: AgentInfo) {
    this.info = info;
  }

  async *ask(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const fullPrompt = opts?.system ? `${opts.system}\n\n${prompt}` : prompt;

    const child = spawn('claude', ['-p', fullPrompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Yield stdout chunks as they arrive
    for await (const chunk of child.stdout) {
      yield (chunk as Buffer).toString('utf8');
    }

    // Capture and surface stderr only on non-zero exit
    const stderrChunks: Buffer[] = [];
    for await (const chunk of child.stderr) {
      stderrChunks.push(chunk as Buffer);
    }

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0) {
          const msg = Buffer.concat(stderrChunks).toString('utf8').trim();
          reject(new Error(`claude exited with code ${code}: ${msg}`));
        } else {
          resolve();
        }
      });
    });
  }
}
