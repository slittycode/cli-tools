/**
 * AWS Bedrock agent (Claude via Bedrock)
 * Uses the official AWS SDK with streaming enabled.
 */
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand, } from '@aws-sdk/client-bedrock-runtime';
import { DEFAULT_BEDROCK_MODEL, DEFAULT_BEDROCK_REGION, MAX_OUTPUT_TOKENS } from '../config.js';
import { wrapAgentError } from '../errors.js';
export class BedrockAgent {
    info;
    client;
    modelId;
    constructor(info) {
        this.info = info;
        this.modelId = process.env.ASK_BEDROCK_MODEL ?? DEFAULT_BEDROCK_MODEL;
        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION ?? DEFAULT_BEDROCK_REGION,
        });
    }
    async *ask(prompt, opts) {
        const messages = [
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
        }
        catch (err) {
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
                        yield parsed.delta.text;
                    }
                }
            }
        }
        catch (err) {
            throw wrapAgentError('Bedrock', err);
        }
    }
}
//# sourceMappingURL=bedrock.js.map