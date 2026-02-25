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
export declare class OpenAIAgent implements Agent {
    info: AgentInfo;
    private apiKey;
    private model;
    constructor(info: AgentInfo);
    ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
}
//# sourceMappingURL=openai.d.ts.map