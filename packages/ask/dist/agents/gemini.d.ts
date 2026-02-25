/**
 * Google Gemini agent
 *
 * Priority:
 *   1. GOOGLE_API_KEY or GEMINI_API_KEY → REST API (gemini-2.0-flash default)
 *   2. `gemini` CLI binary → spawns subprocess (no key needed if CLI is authed)
 *
 * Model override: ASK_GEMINI_MODEL env var
 */
import { Agent, AgentInfo, AskOptions } from '../types.js';
export declare class GeminiAgent implements Agent {
    info: AgentInfo;
    private apiKey;
    private model;
    private useCli;
    constructor(info: AgentInfo);
    ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
    private askViaApi;
    private askViaCli;
}
//# sourceMappingURL=gemini.d.ts.map