/**
 * Google Gemini agent
 *
 * Priority:
 *   1. GOOGLE_API_KEY or GEMINI_API_KEY → REST API (gemini-2.0-flash default)
 *   2. `gemini` CLI binary → spawns subprocess (no key needed if CLI is authed)
 *
 * Model override: ASK_GEMINI_MODEL env var
 */

import { spawn } from 'child_process';
import { Agent, AgentInfo, AskOptions } from '../types.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiAgent implements Agent {
  info: AgentInfo;
  private apiKey: string | undefined;
  private model: string;
  private useCli: boolean;

  constructor(info: AgentInfo) {
    this.info = info;
    this.apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    this.model = process.env.ASK_GEMINI_MODEL ?? DEFAULT_MODEL;
    // Fall back to CLI only when no key is set
    this.useCli = !this.apiKey && info.via === 'gemini CLI';
  }

  async *ask(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    if (this.useCli) {
      yield* this.askViaCli(prompt, opts);
    } else {
      yield* this.askViaApi(prompt, opts);
    }
  }

  private async *askViaApi(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const url = `${API_BASE}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const systemParts = opts?.system
      ? { system_instruction: { parts: [{ text: opts.system }] } }
      : {};

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...systemParts,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    // Parse SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const parsed = JSON.parse(raw);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text as string;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }

  private async *askViaCli(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const fullPrompt = opts?.system ? `${opts.system}\n\n${prompt}` : prompt;

    const child = spawn('gemini', [fullPrompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    for await (const chunk of child.stdout) {
      yield (chunk as Buffer).toString('utf8');
    }

    const stderrChunks: Buffer[] = [];
    for await (const chunk of child.stderr) {
      stderrChunks.push(chunk as Buffer);
    }

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code !== 0) {
          const msg = Buffer.concat(stderrChunks).toString('utf8').trim();
          reject(new Error(`gemini CLI exited with code ${code}: ${msg}`));
        } else {
          resolve();
        }
      });
    });
  }
}
