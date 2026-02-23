# Agent Handoff Prompt for ctx

Copy everything below the line to give to another AI agent:

---

## Your Task

You are implementing **ctx** — a CLI tool that captures project context and outputs it for AI consumption.

**Read the specification first:** `SPEC.md` in this directory is the canonical source of truth. Follow it exactly.

## Project Location

```
~/code/projects/ctx/
```

## What ctx Does

```bash
# Generate context for current project
ctx

# Include specific files
ctx --files src/types.ts

# Pipe to AI tools
ctx | codex "implement X"

# Store preferences
ctx pref set style "functional, immutable"
```

## Implementation Order

Follow SPEC.md Phase 1 exactly:

1. **Project Setup** — Initialize npm/TypeScript project with commander, chalk, simple-git
2. **Detector** — Auto-detect stack from package.json, pyproject.toml, etc.
3. **Collector** — Gather file structure, git status, recent files
4. **Formatter** — Generate `<context>...</context>` output block
5. **CLI** — Wire up `ctx`, `ctx --files`, `ctx --compact`, `ctx --copy`

## Technical Constraints (Locked)

- TypeScript + Node.js
- Dependencies: `commander`, `chalk`, `simple-git`
- Config location: `~/.ctx/`
- Output format: XML-style tags (`<context>...</context>`)
- Must be fast: <500ms for typical project

## Directory Structure to Create

```
ctx/
├── src/
│   ├── cli/
│   │   ├── index.ts
│   │   └── commands/
│   ├── detector/
│   │   ├── Detector.ts
│   │   └── detectors/
│   ├── collector/
│   │   └── Collector.ts
│   ├── formatter/
│   │   └── Formatter.ts
│   ├── config/
│   │   └── Config.ts
│   ├── types.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── SPEC.md
```

## Expected Output Format

```xml
<context>
Project: my-project
Path: ~/code/projects/my-project

Stack:
  Language: TypeScript
  Runtime: Node.js 20
  Tools: ESLint, Prettier

Git:
  Branch: main
  Status: clean

Structure:
  src/
    components/
    utils/
  package.json

Recent Files:
  - src/index.ts (modified today)

</context>
```

## Success Criteria

Phase 1 is complete when:
- [ ] `ctx` outputs useful context for a TypeScript project
- [ ] `ctx` outputs useful context for a Python project
- [ ] `ctx --files <path>` includes file contents
- [ ] `ctx --compact` outputs shorter format
- [ ] `ctx --copy` copies to clipboard
- [ ] All tests pass

## Start Command

```bash
cd ~/code/projects/ctx
# Read the spec first
cat SPEC.md | head -200

# Then initialize and start coding
npm init -y
npm install typescript @types/node commander chalk simple-git --save
npx tsc --init
```

## Notes

- This is a local-only CLI tool, no cloud/API
- Prioritize speed — users will run this frequently
- Keep output token-efficient for LLM consumption
- See SPEC.md sections on Data Models and TypeScript Types for exact interfaces

---

*End of handoff prompt*
