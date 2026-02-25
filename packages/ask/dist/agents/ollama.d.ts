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
export declare class OllamaAgent implements Agent {
    info: AgentInfo;
    private model;
    constructor(info: AgentInfo, modelOverride?: string);
    ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
    /** Display name includes the resolved model */
    get displayName(): string;
}
//# sourceMappingURL=ollama.d.ts.map