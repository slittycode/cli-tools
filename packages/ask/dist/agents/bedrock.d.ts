/**
 * AWS Bedrock agent (Claude via Bedrock)
 * Uses the official AWS SDK with streaming enabled.
 */
import { Agent, AgentInfo, AskOptions } from '../types.js';
export declare class BedrockAgent implements Agent {
    info: AgentInfo;
    private client;
    private modelId;
    constructor(info: AgentInfo);
    ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
}
//# sourceMappingURL=bedrock.d.ts.map