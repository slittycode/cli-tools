import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
const client = new AnthropicBedrock({ awsRegion: "us-east-1", awsProfile: "slittycodes" });
async function run() {
  try {
    const stream = await client.messages.create({
      model: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
      stream: true
    });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        process.stdout.write(chunk.delta.text);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
