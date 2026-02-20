import Anthropic from "@anthropic-ai/sdk";
import simpleGit from "simple-git";
import { collectSignals, formatSignalsMessage } from "./collect.js";

const SYSTEM_PROMPT = `You are a terse, observant assistant. Describe the current state of a software project in 2-3 casual sentences based on signals provided. Write like a weatherman giving a quick forecast — direct, vivid, no bullet points, no headers, no technical jargon. Capture the feeling of the project, not a status report.`;

async function main(): Promise<void> {
  const cwd = process.cwd();

  // Check git repo
  const isRepo = await simpleGit(cwd).checkIsRepo();
  if (!isRepo) {
    process.stderr.write("mood: not a git repository\n");
    process.exit(1);
  }

  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write("mood: ANTHROPIC_API_KEY not set\n");
    process.exit(1);
  }

  const signals = await collectSignals(cwd);
  const message = formatSignalsMessage(signals);

  const client = new Anthropic();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);

  try {
    const stream = client.messages.stream(
      {
        model: "claude-opus-4-6",
        max_tokens: 120,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      },
      { signal: abort.signal },
    );

    for await (const text of stream.textStream) {
      process.stdout.write(text);
    }
    process.stdout.write("\n");
  } catch (err) {
    if (abort.signal.aborted) {
      process.stderr.write("mood: API request timed out\n");
    } else {
      process.stderr.write(
        `mood: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

main();
