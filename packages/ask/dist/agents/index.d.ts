/**
 * Agent factory — instantiates the right agent class for a given AgentInfo
 */
import { Agent, AgentInfo } from '../types.js';
import { ClaudeCliAgent } from './claude-cli.js';
import { BedrockAgent } from './bedrock.js';
import { OpenAIAgent } from './openai.js';
import { GeminiAgent } from './gemini.js';
import { OllamaAgent } from './ollama.js';
export declare function createAgent(info: AgentInfo, modelOverride?: string): Agent;
export { ClaudeCliAgent, BedrockAgent, OpenAIAgent, GeminiAgent, OllamaAgent };
//# sourceMappingURL=index.d.ts.map