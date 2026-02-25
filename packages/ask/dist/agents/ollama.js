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
import { DEFAULT_OLLAMA_MODEL, OLLAMA_API_BASE } from '../config.js';
import { wrapAgentError } from '../errors.js';
/** Request timeout for Ollama (2 minutes — local models can be slow to start) */
const FETCH_TIMEOUT_MS = 120_000;
export class OllamaAgent {
    info;
    model;
    constructor(info, modelOverride) {
        this.info = info;
        // Resolution: explicit override > env var > detected model from info > default
        this.model = modelOverride ?? process.env.ASK_OLLAMA_MODEL ?? info.model ?? DEFAULT_OLLAMA_MODEL;
    }
    async *ask(prompt, opts) {
        const messages = [];
        if (opts?.system) {
            messages.push({ role: 'system', content: opts.system });
        }
        messages.push({ role: 'user', content: prompt });
        const res = await fetch(`${OLLAMA_API_BASE}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: true,
            }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok || !res.body) {
            const raw = await res.text().catch(() => '(unreadable)');
            throw wrapAgentError('Ollama', new Error(`HTTP ${res.status}: ${raw}`));
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const lines = decoder.decode(value, { stream: true }).split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const parsed = JSON.parse(line);
                    if (parsed?.message?.content) {
                        yield parsed.message.content;
                    }
                    if (parsed?.done === true)
                        return;
                }
                catch {
                    // ignore partial json
                }
            }
        }
    }
    /** Display name includes the resolved model */
    get displayName() {
        return `Ollama (${this.model})`;
    }
}
//# sourceMappingURL=ollama.js.map