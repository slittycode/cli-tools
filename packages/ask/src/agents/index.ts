/**
 * Agent factory — instantiates the right agent class for a given AgentInfo
 */

import { Agent, AgentInfo } from '../types.js';
import { ClaudeCliAgent } from './claude-cli.js';
import { BedrockAgent } from './bedrock.js';
import { OpenAIAgent } from './openai.js';
import { GeminiAgent } from './gemini.js';
import { OllamaAgent } from './ollama.js';

export function createAgent(info: AgentInfo, modelOverride?: string): Agent {
  switch (info.id) {
    case 'claude-cli':
      return new ClaudeCliAgent(info);
    case 'bedrock':
      return new BedrockAgent(info);
    case 'openai':
      return new OpenAIAgent(info);
    case 'gemini':
      return new GeminiAgent(info);
    case 'ollama':
      return new OllamaAgent(info, modelOverride);
    default:
      throw new Error(`No agent implementation for: ${info.id}`);
  }
}

export { ClaudeCliAgent, BedrockAgent, OpenAIAgent, GeminiAgent, OllamaAgent };
