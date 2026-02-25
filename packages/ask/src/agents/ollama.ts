/**
 * Ollama agent — local LLM inference
 *
 * Handles any model available in your local Ollama instance, including:
 *   - qwen2.5, qwen2.5-coder
 *   - llama3, llama3.1
 *   - mistral, mixtral
 *   - codellama, deepseek-coder
 *   - gemma2, phi4, etc.
 *
 * Model resolution order:
 *   1. --agent ollama:modelname  (e.g. ask --agent ollama:qwen2.5)
 *   2. ASK_OLLAMA_MODEL env var
 *   3. First Qwen model found in pulled models
 *   4. First available model
 */

import { Agent, AgentInfo, AskOptions } from '../types.js';

const BASE_URL = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

export class OllamaAgent implements Agent {
  info: AgentInfo;
  private model: string;

  constructor(info: AgentInfo, modelOverride?: string) {
    this.info = info;
    // Resolution: explicit override > env var > detected model from info > 'qwen2.5'
    this.model = modelOverride ?? process.env.ASK_OLLAMA_MODEL ?? info.model ?? 'qwen2.5';
  }

  async *ask(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (opts?.system) {
      messages.push({ role: 'system', content: opts.system });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      throw new Error(`Ollama error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed?.message?.content) {
            yield parsed.message.content as string;
          }
          if (parsed?.done === true) return;
        } catch {
          // ignore partial json
        }
      }
    }
  }

  /** Display name includes the resolved model */
  get displayName(): string {
    return `Ollama (${this.model})`;
  }
}
