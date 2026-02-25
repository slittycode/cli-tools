/**
 * AWS Bedrock agent (Claude via Bedrock)
 * Uses the official AWS SDK with streaming enabled.
 */

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Agent, AgentInfo, AskOptions } from '../types.js';
import { DEFAULT_BEDROCK_MODEL, DEFAULT_BEDROCK_REGION, MAX_OUTPUT_TOKENS } from '../config.js';
import { wrapAgentError } from '../errors.js';

export class BedrockAgent implements Agent {
  info: AgentInfo;
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(info: AgentInfo) {
    this.info = info;
    this.modelId = process.env.ASK_BEDROCK_MODEL ?? DEFAULT_BEDROCK_MODEL;
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION ?? DEFAULT_BEDROCK_REGION,
    });
  }

  async *ask(prompt: string, opts?: AskOptions): AsyncGenerator<string> {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: prompt },
    ];

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: MAX_OUTPUT_TOKENS,
      system: opts?.system,
      messages,
    });

    const cmd = new InvokeModelWithResponseStreamCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    let response;
    try {
      response = await this.client.send(cmd);
    } catch (err) {
      throw wrapAgentError('Bedrock', err);
    }

    if (!response.body) {
      throw wrapAgentError('Bedrock', new Error('Empty response body'));
    }

    try {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const parsed = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text as string;
          }
        }
      }
    } catch (err) {
      throw wrapAgentError('Bedrock', err);
    }
  }
}
