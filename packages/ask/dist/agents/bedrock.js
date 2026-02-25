/**
 * AWS Bedrock agent (Claude via Bedrock)
 * Uses the official AWS SDK with streaming enabled.
 */
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand, } from '@aws-sdk/client-bedrock-runtime';
const DEFAULT_MODEL = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_REGION = 'us-east-1';
export class BedrockAgent {
    info;
    client;
    modelId;
    constructor(info) {
        this.info = info;
        this.modelId = process.env.ASK_BEDROCK_MODEL ?? DEFAULT_MODEL;
        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION ?? DEFAULT_REGION,
        });
    }
    async *ask(prompt, opts) {
        const messages = [
            { role: 'user', content: prompt },
        ];
        const body = JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 4096,
            system: opts?.system,
            messages,
        });
        const cmd = new InvokeModelWithResponseStreamCommand({
            modelId: this.modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: new TextEncoder().encode(body),
        });
        const response = await this.client.send(cmd);
        if (!response.body) {
            throw new Error('Empty response from Bedrock');
        }
        for await (const event of response.body) {
            if (event.chunk?.bytes) {
                const parsed = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    yield parsed.delta.text;
                }
            }
        }
    }
}
//# sourceMappingURL=bedrock.js.map