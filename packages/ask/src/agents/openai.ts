/**
 * OpenAI / ChatGPT agent
 *
 * Authenticates via OPENAI_API_KEY environment variable.
 * Uses the streaming Chat Completions endpoint — no extra SDK needed.
 *
 * Model override: ASK_OPENAI_MODEL env var (default: gpt-4o)
 *
 * To get an API key: https://platform.openai.com/api-keys
 */

import { Agent, AgentInfo, AskOptions } from '../types.js';

const DEFAULT_MODEL = 'gpt-4o';
const API_BASE = 'https://api.openai.com/v1';

export class OpenAIAgent implements Agent {
  info: AgentInfo;
  private apiKey: string;
  private model: string;

  constructor(info: AgentInfo) {
    this.info = info;
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    this.apiKey = key;
    this.model = process.env.ASK_OPENAI_MODEL ?? DEFAULT_MODEL;
  }

  async *ask(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (opts?.system) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    // Parse SSE stream — each line is "data: <json>" or "data: [DONE]"
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
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  }
}
