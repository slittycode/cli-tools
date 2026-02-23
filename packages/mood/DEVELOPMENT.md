# Development History: `mood` CLI

**Developed:** Feb 21, 2026

If traditional status checkers are objective inspectors, `mood` was built to be the creative weatherman. It provides a subjective, 2-3 sentence "vibe" check of a project using AI.

## The Approach
- **TypeScript & ESM:** A single TypeScript binary using Node 22 (`tsup` for building, `vitest` for testing).
- **Fast Signals:** The signal collector (`src/collect.ts`) gathers git context, parses TODO markers, and checks package manifests. To prevent hangs, all git commands use `Promise.race` with a 500ms safety timeout.
- **Bolder UX with Prompting:** Instead of passing raw JSON signals, `mood` formats the signals into a structured prose paragraph to give Claude natural conversational context. The system prompt instructs the AI to write like an observant weatherman answering with casual, vivid observations.
- **AWS Bedrock Streaming:** Originally scoped to use the direct Anthropic SDK, `mood` was pivoted to use the `@anthropic-ai/bedrock-sdk`. This allows it to rely on existing local AWS SSO credentials (`AWS_PROFILE=slittycodes`, `AWS_REGION=us-east-1`), bypassing the need for dedicated API keys.
- **Immediate Feedback:** To make the tool feel alive, responses are natively streamed token-by-token directly to `stdout`. An `AbortController` ensures the entire interaction is forcefully capped at 10 seconds.
- **Real-World Verification:** Tested deliberately across entirely clean trees, filthy trees with uncommitted changes and TODO markers, non-git directories, and environments with missing credentials to ensure robust and graceful failure paths.
