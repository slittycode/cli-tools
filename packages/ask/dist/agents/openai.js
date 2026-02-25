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
import { DEFAULT_OPENAI_MODEL, MAX_OUTPUT_TOKENS, OPENAI_API_BASE } from '../config.js';
import { sanitizeForDisplay } from '../errors.js';
/** Request timeout for the OpenAI streaming endpoint (60 s) */
const FETCH_TIMEOUT_MS = 60_000;
export class OpenAIAgent {
    info;
    apiKey;
    model;
    constructor(info) {
        this.info = info;
        const key = process.env.OPENAI_API_KEY;
        if (!key)
            throw new Error('OPENAI_API_KEY is not set');
        this.apiKey = key;
        this.model = process.env.ASK_OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
    }
    async *ask(prompt, opts) {
        const messages = [];
        if (opts?.system) {
            messages.push({ role: 'system', content: opts.system });
        }
        messages.push({ role: 'user', content: prompt });
        const res = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: true,
                max_tokens: MAX_OUTPUT_TOKENS,
            }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok || !res.body) {
            // Read the error body but sanitize before surfacing — the response
            // could contain reflected authentication details.
            const raw = await res.text().catch(() => '(unreadable)');
            throw new Error(sanitizeForDisplay(`OpenAI error ${res.status}: ${raw}`));
        }
        // Parse SSE stream — each line is "data: <json>" or "data: [DONE]"
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.startsWith('data: '))
                    continue;
                const raw = line.slice(6).trim();
                if (raw === '[DONE]')
                    return;
                try {
                    const parsed = JSON.parse(raw);
                    const delta = parsed?.choices?.[0]?.delta?.content;
                    if (delta)
                        yield delta;
                }
                catch {
                    // ignore malformed SSE lines
                }
            }
        }
    }
}
//# sourceMappingURL=openai.js.map