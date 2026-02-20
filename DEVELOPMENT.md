# Development History: Project Assessment Tools (`chk` & `mood`)

This document captures the development process and philosophy behind the two sibling CLI utilities created for project assessment: `chk` and `mood`.

Both tools were built with a shared goal: giving developers immediate, low-friction visibility into the state of a software project, but from two different perspectives.

## 1. `chk` — The Project Health Checklist
**Developed:** Feb 20, 2026

`chk` is the deterministic, traffic-light health assessment tool. It was built to quickly run a suite of 8 core health checks across any project directory.

**Key Features:**
- Executes a defined framework of 8 health checks.
- Traffic-light output: issues are flagged as ✖ (red/critical) or ▲ (amber/warning).
- Supports flags like `--verbose` for detailed breakdown and `--json` for programmatic consumption.
- Capable of running from both the project directory and the user's home directory across multiple projects.

**Development Process:**
- Scaffolding the core CLI framework and configuration.
- Iteratively implementing each of the 8 health checks.
- Compiling, globally linking, and testing edge cases (e.g., global runs vs. local project runs).
- Integrated into the agent's workflow (`.agent/workflows/health-check.md`) as the primary gatekeeper before beginning new work on a project.

## 2. `mood` — The Project Vibe Check
**Developed:** Feb 21, 2026

If `chk` is the objective health inspector, `mood` is the creative weatherman. It provides a subjective, 2-3 sentence "vibe" check of a project using AI.

**Key Features:**
- A single TypeScript ESM binary using Node 22 (`tsup`, `vitest`).
- Collects 7 fast project signals (current branch, commit age, latest commit message, uncommitted changes, project type, and a `grep`-style scan for TODO/FIXME/HACK markers).
- Formats these signals into a structured prose paragraph.
- Streams a token-by-token response using the AWS Bedrock SDK (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`) directly into the terminal, requiring no Anthropic API keys (uses local AWS SSO credentials).

**Development Process:**
- **Tighter Scope:** Originally planned with an abstract API module, the implementation was tightened into just two source files (`cli.ts` and `collect.ts`).
- **Data Collection:** Built a robust signal collector (`collect.ts`) that runs standard git commands (`simple-git`) with 500ms safety timeouts so the CLI never hangs. 
- **Bolder UX:** Instead of passing raw JSON, the prompt design was optimized to pass structured prose to Claude, instructing it to act like a observant weatherman answering with casual, vivid observations.
- **Streaming:** Switched from a blocking API call to native streaming via `.create({ stream: true })`, utilizing an `AbortController` for a 10s maximum wait time. This makes the CLI feel instantly alive.
- **Verified on Real Code:** The tool was actively tested across clean trees, dirty trees with TODO markers, and non-git directories to ensure perfect failure states and dynamic outputs.

## The Philosophy

Both projects share a "fail fast and clearly" philosophy:
- Neither tool hangs; they aggressively timeout or skip heavy operations.
- They are zero-config (`chk` runs out of the box, `mood` uses existing AWS environment variables).
- Together, they give the full picture of a project: `chk` answers "Is it broken?", and `mood` answers "How active is the development site today?".
