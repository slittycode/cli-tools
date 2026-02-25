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
import { DEFAULT_GEMINI_MODEL, GEMINI_API_BASE, MAX_OUTPUT_TOKENS } from '../config.js';
import { sanitizeForDisplay } from '../errors.js';
/** Request timeout for the Gemini streaming endpoint (60 s) */
const FETCH_TIMEOUT_MS = 60_000;
export class GeminiAgent {
    info;
    apiKey;
    model;
    useCli;
    constructor(info) {
        this.info = info;
        this.apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
        this.model = process.env.ASK_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
        // Fall back to CLI only when no key is set
        this.useCli = !this.apiKey && info.via === 'gemini CLI';
    }
    async *ask(prompt, opts) {
        if (this.useCli) {
            yield* this.askViaCli(prompt, opts);
        }
        else {
            yield* this.askViaApi(prompt, opts);
        }
    }
    async *askViaApi(prompt, opts) {
        const url = `${GEMINI_API_BASE}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
        const systemParts = opts?.system
            ? { system_instruction: { parts: [{ text: opts.system }] } }
            : {};
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...systemParts,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
            }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok || !res.body) {
            const raw = await res.text().catch(() => '(unreadable)');
            throw new Error(sanitizeForDisplay(`Gemini error ${res.status}: ${raw}`));
        }
        // Parse SSE stream
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
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text)
                        yield text;
                }
                catch {
                    // ignore malformed lines
                }
            }
        }
    }
    async *askViaCli(prompt, opts) {
        const fullPrompt = opts?.system ? `${opts.system}\n\n${prompt}` : prompt;
        const child = spawn('gemini', [fullPrompt], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        for await (const chunk of child.stdout) {
            yield chunk.toString('utf8');
        }
        const stderrChunks = [];
        for await (const chunk of child.stderr) {
            stderrChunks.push(chunk);
        }
        await new Promise((resolve, reject) => {
            child.on('close', (code) => {
                if (code !== 0) {
                    // Sanitize subprocess stderr — it may echo back API keys in some CLIs
                    const msg = sanitizeForDisplay(Buffer.concat(stderrChunks).toString('utf8').trim());
                    reject(new Error(`gemini CLI exited with code ${code}: ${msg}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
}
//# sourceMappingURL=gemini.js.map