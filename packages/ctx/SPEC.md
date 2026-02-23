# ctx: Comprehensive Project Specification

> **Purpose of this document:** Canonical source of truth for the ctx project. Any agent or developer implementing this project MUST follow this specification.

---

## Table of Contents

1. [Vision & Goal](#vision--goal)
2. [User Experience](#user-experience)
3. [Core Concepts](#core-concepts)
4. [Architecture](#architecture)
5. [Technical Decisions (Locked)](#technical-decisions-locked)
6. [Implementation Phases](#implementation-phases)
7. [Directory Structure](#directory-structure)
8. [CLI Commands](#cli-commands)
9. [Data Models](#data-models)
10. [Context Generation](#context-generation)
11. [Integration Points](#integration-points)
12. [Testing Requirements](#testing-requirements)
13. [Success Criteria](#success-criteria)
14. [Constraints & Non-Goals](#constraints--non-goals)

---

## Vision & Goal

### One-Sentence Vision
**Never re-explain your project to an AI again — capture context once, inject everywhere.**

### The Problem
Every AI conversation starts with friction:
- "I'm working on a TypeScript project called..."
- "My coding style prefers functional patterns..."
- "Here's the relevant file structure..."
- "I'm using Node.js 20, strict TypeScript..."

This wastes time and tokens. Worse:
- Context is lost when switching AI tools (Claude → Codex → ChatGPT)
- Context is lost when starting new sessions
- You forget to mention important constraints
- Each AI tool has different context format expectations

### The Solution
A CLI tool that:
1. **Captures** project context automatically (cwd, git, files, stack)
2. **Stores** your preferences (coding style, constraints, common patterns)
3. **Generates** formatted context blocks for AI consumption
4. **Integrates** with AI CLI tools (pipe, inject, clipboard)
5. **Learns** from your projects (detects stack, conventions)

### Core Principle
**Context is the multiplier.** Better context = better AI output = less iteration = more productivity.

---

## User Experience

### Primary Flows

#### Flow 1: Quick Context Generation
```bash
$ cd ~/code/projects/auto-prompt-complete
$ ctx
<context>
Project: auto-prompt-complete
Path: ~/code/projects/auto-prompt-complete
Stack: TypeScript, Node.js 20
Git: main branch, clean

Structure:
  src/
    embedding/
    vector/
    storage/
    core/
    daemon/
    cli/
  SPEC.md
  package.json

Recent: src/types.ts (modified today)
</context>

# Output is ready to paste or pipe
```

#### Flow 2: Pipe to AI Tool
```bash
# Inline with command
$ ctx | codex "implement the EmbeddingEngine class"

# Or with explicit prompt
$ ctx --prompt "implement EmbeddingEngine" | codex

# Works with any tool that accepts stdin
$ ctx | claude --prompt "review this architecture"
$ ctx | aider
$ ctx | goose
```

#### Flow 3: Capture Specific Files
```bash
# Include specific files in context
$ ctx --files src/types.ts src/SPEC.md
<context>
...
Files:
--- src/types.ts ---
export interface Prompt { ... }
--- SPEC.md ---
# ctx: Comprehensive Project Specification
...
</context>

# Include by glob pattern
$ ctx --files "src/**/*.ts"

# Include recent files only
$ ctx --recent 5
```

#### Flow 4: Store Preferences
```bash
# Set global preferences (apply to all projects)
$ ctx pref set style "functional, immutable, minimal comments"
$ ctx pref set typescript "strict mode, explicit types, no any"

# Set project-specific preferences
$ ctx pref set --project constraints "local-first, no cloud dependencies"

# View preferences
$ ctx pref list
Global:
  style: functional, immutable, minimal comments
  typescript: strict mode, explicit types, no any

Project (auto-prompt-complete):
  constraints: local-first, no cloud dependencies
```

#### Flow 5: Project Profiles
```bash
# Save current context as a named profile
$ ctx save "apc-core"
Saved profile: apc-core

# Load and use a profile
$ ctx load apc-core | codex "continue implementing"

# List profiles
$ ctx profiles
  apc-core       (auto-prompt-complete, saved 2h ago)
  apc-daemon     (auto-prompt-complete, saved yesterday)
  mrbench-cli    (model-benchmark, saved 3d ago)
```

#### Flow 6: Smart Detection
```bash
$ cd ~/code/projects/model-benchmark
$ ctx
<context>
Project: model-benchmark (mrbench)
Path: ~/code/projects/model-benchmark
Stack: Python 3.12, Typer, Rich, Pydantic
Git: main branch, 2 uncommitted files

Structure:
  src/mrbench/
    adapters/    (8 files)
    cli/         (11 files)
    core/        (6 files)
  tests/
  pyproject.toml

Detected:
  - CLI application (Typer)
  - Type-checked (mypy strict)
  - Linted (ruff)
</context>

# Stack auto-detected from pyproject.toml, package.json, etc.
```

### User Stories

**US-1: Quick Context**
> As a developer, I want to run `ctx` and immediately get a well-formatted context block I can paste into any AI tool.

**US-2: Pipe Workflow**
> As a developer, I want to pipe context directly to AI CLI tools so I don't have to copy-paste.

**US-3: Include Files**
> As a developer, I want to include specific file contents in context when they're relevant to my question.

**US-4: Persistent Preferences**
> As a developer, I want my coding style preferences remembered so every AI conversation starts with that context.

**US-5: Project Detection**
> As a developer, I want ctx to automatically detect my project's tech stack so I don't have to specify it.

**US-6: Reusable Profiles**
> As a developer working on different parts of a project, I want to save and load context profiles for different tasks.

---

## Core Concepts

### Context Block
A formatted text block containing project information for AI consumption. Designed to be:
- **Human-readable**: Easy to verify before sending
- **AI-parseable**: Clear structure for LLMs
- **Token-efficient**: Include what matters, skip what doesn't

### Preferences
User settings that apply to AI interactions:
- **Global**: Apply to all projects (coding style, language preferences)
- **Project-specific**: Apply to one project (constraints, conventions)

### Profile
A saved snapshot of context for a specific task or project state. Includes:
- Project path
- Selected files
- Custom notes
- Timestamp

### Stack Detection
Automatic detection of:
- **Language**: TypeScript, Python, Rust, Go, etc.
- **Framework**: React, FastAPI, Express, etc.
- **Tools**: ESLint, mypy, ruff, pytest, etc.
- **Runtime**: Node.js version, Python version

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S MACHINE                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLI (ctx)                            │   │
│  │  ctx, ctx --files, ctx pref, ctx save, ctx load          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CORE ENGINE                            │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │  Detector   │  │  Collector  │  │   Formatter     │   │   │
│  │  │ (stack,     │  │ (files, git │  │ (output         │   │   │
│  │  │  tools)     │  │  structure) │  │  generation)    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │         │                │                  │             │   │
│  │         └────────────────┼──────────────────┘             │   │
│  │                          ▼                                │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │              PREFERENCES & PROFILES               │    │   │
│  │  │  ~/.ctx/                                          │    │   │
│  │  │  ├── config.json     (global prefs)              │    │   │
│  │  │  └── profiles/       (saved contexts)            │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    OUTPUT (stdout)                        │   │
│  │                                                           │   │
│  │  <context>                                                │   │
│  │  Project: auto-prompt-complete                            │   │
│  │  Stack: TypeScript, Node.js                               │   │
│  │  ...                                                      │   │
│  │  </context>                                               │   │
│  │                                                           │   │
│  │  → Pipe to: codex, claude, aider, goose, etc.            │   │
│  │  → Copy to: clipboard                                     │   │
│  │  → Save to: file                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Detector
- Detect language/framework from files (package.json, pyproject.toml, Cargo.toml, etc.)
- Detect tools from config files (.eslintrc, mypy.ini, ruff.toml, etc.)
- Detect runtime versions
- Cache detection results for performance

#### Collector
- Gather file structure (respect .gitignore)
- Read git status (branch, uncommitted changes)
- Identify recent files (by mtime)
- Read file contents when requested

#### Formatter
- Generate context block in consistent format
- Include/exclude sections based on flags
- Optimize for token count when requested
- Support multiple output formats (xml-style, markdown, json)

---

## Technical Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript (Node.js) | Consistent with other projects, fast enough |
| Config location | `~/.ctx/` | Conventional user config location |
| Output format | XML-style tags | Best parsed by LLMs, clear boundaries |
| CLI framework | `commander` | Consistent with other projects |
| File reading | Sync (fs) | Simple, fast enough for CLI |
| Git integration | `simple-git` or shell out | Need status and branch info |

### Output Format Rationale

Using XML-style tags (`<context>...</context>`) because:
1. **LLMs parse it well** — Claude and GPT understand XML structure
2. **Clear boundaries** — obvious where context starts/ends
3. **Nestable** — can have `<files>`, `<preferences>` subsections
4. **No escaping issues** — unlike JSON, code blocks work fine inside

---

## Implementation Phases

### Phase 1: Core MVP (Day 1)
**Goal:** `ctx` command outputs useful context for current directory.

#### 1.1 Project Setup
- [ ] Initialize npm project with TypeScript
- [ ] Configure tsconfig.json (strict mode)
- [ ] Set up directory structure
- [ ] Add dependencies: `commander`, `chalk`, `simple-git`
- [ ] Create build script

#### 1.2 Detector
- [ ] Create `src/detector/Detector.ts`
- [ ] Detect from `package.json` (Node.js, deps, scripts)
- [ ] Detect from `pyproject.toml` (Python, deps)
- [ ] Detect from `Cargo.toml` (Rust)
- [ ] Detect from `go.mod` (Go)
- [ ] Detect common tools (.eslintrc, .prettierrc, ruff.toml, etc.)
- [ ] Write tests

#### 1.3 Collector
- [ ] Create `src/collector/Collector.ts`
- [ ] Get directory structure (respect .gitignore)
- [ ] Get git status (branch, dirty/clean, uncommitted count)
- [ ] Get recent files (last 5 by mtime)
- [ ] Read file contents when requested
- [ ] Write tests

#### 1.4 Formatter
- [ ] Create `src/formatter/Formatter.ts`
- [ ] Generate context block with all sections
- [ ] Support `--compact` flag for shorter output
- [ ] Support `--json` flag for structured output
- [ ] Write tests

#### 1.5 Basic CLI
- [ ] Implement `ctx` (default: output context)
- [ ] Implement `ctx --files <paths>` (include file contents)
- [ ] Implement `ctx --recent <n>` (include n recent files)
- [ ] Implement `ctx --compact` (shorter output)
- [ ] Implement `ctx --copy` (copy to clipboard)
- [ ] Write CLI tests

### Phase 2: Preferences (Day 2)
**Goal:** Store and include user preferences in context.

#### 2.1 Config Storage
- [ ] Create `src/config/Config.ts`
- [ ] Initialize `~/.ctx/` directory
- [ ] Read/write `config.json` (global prefs)
- [ ] Read/write `projects/<hash>.json` (project prefs)
- [ ] Write tests

#### 2.2 Preferences CLI
- [ ] Implement `ctx pref set <key> <value>`
- [ ] Implement `ctx pref set --project <key> <value>`
- [ ] Implement `ctx pref get <key>`
- [ ] Implement `ctx pref list`
- [ ] Implement `ctx pref remove <key>`
- [ ] Include preferences in context output
- [ ] Write CLI tests

### Phase 3: Profiles (Day 3)
**Goal:** Save and load context snapshots.

#### 3.1 Profile Storage
- [ ] Create `src/profiles/Profiles.ts`
- [ ] Save profiles to `~/.ctx/profiles/<name>.json`
- [ ] Store: project path, selected files, notes, timestamp
- [ ] Write tests

#### 3.2 Profiles CLI
- [ ] Implement `ctx save <name>` (save current context as profile)
- [ ] Implement `ctx load <name>` (output saved profile)
- [ ] Implement `ctx profiles` (list saved profiles)
- [ ] Implement `ctx delete <name>` (delete profile)
- [ ] Write CLI tests

### Phase 4: Polish & Integration (Day 4)
**Goal:** Smooth integration with AI tools, good UX.

#### 4.1 Integration Helpers
- [ ] Implement `ctx --prompt <text>` (append prompt after context)
- [ ] Implement `ctx --wrap <tool>` (format for specific tool)
- [ ] Test with: codex, claude, aider, goose
- [ ] Document integration patterns

#### 4.2 UX Polish
- [ ] Add colors to CLI output
- [ ] Add `--help` for all commands
- [ ] Add shell completions (zsh, bash)
- [ ] Handle edge cases (not a git repo, empty project, etc.)

#### 4.3 Distribution
- [ ] Configure package.json for npm
- [ ] Add bin entry for `ctx` command
- [ ] Write README with examples
- [ ] Publish to npm

---

## Directory Structure

```
ctx/
├── src/
│   ├── cli/
│   │   ├── index.ts                # CLI entry point
│   │   └── commands/
│   │       ├── context.ts          # Default ctx command
│   │       ├── pref.ts             # Preferences commands
│   │       └── profile.ts          # Profile commands
│   ├── detector/
│   │   ├── Detector.ts             # Stack detection
│   │   ├── detectors/
│   │   │   ├── node.ts
│   │   │   ├── python.ts
│   │   │   ├── rust.ts
│   │   │   └── go.ts
│   │   └── Detector.test.ts
│   ├── collector/
│   │   ├── Collector.ts            # File/git collection
│   │   └── Collector.test.ts
│   ├── formatter/
│   │   ├── Formatter.ts            # Output generation
│   │   └── Formatter.test.ts
│   ├── config/
│   │   ├── Config.ts               # Preferences storage
│   │   └── Config.test.ts
│   ├── profiles/
│   │   ├── Profiles.ts             # Profile storage
│   │   └── Profiles.test.ts
│   ├── types.ts
│   └── index.ts
├── tests/
│   └── integration/
├── package.json
├── tsconfig.json
├── SPEC.md                         # This document
└── README.md
```

### Config Directory (`~/.ctx/`)
```
~/.ctx/
├── config.json                     # Global preferences
├── profiles/
│   ├── apc-core.json
│   ├── apc-daemon.json
│   └── mrbench-cli.json
└── projects/
    ├── a1b2c3d4.json               # Project prefs (hashed path)
    └── e5f6g7h8.json
```

---

## CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `ctx` | Output context for cwd | `ctx` |
| `ctx --files <paths>` | Include file contents | `ctx --files src/types.ts` |
| `ctx --recent <n>` | Include n recent files | `ctx --recent 5` |
| `ctx --compact` | Shorter output | `ctx --compact` |
| `ctx --copy` | Copy to clipboard | `ctx --copy` |
| `ctx --prompt <text>` | Append prompt | `ctx --prompt "implement X"` |
| `ctx pref set <k> <v>` | Set global preference | `ctx pref set style "functional"` |
| `ctx pref set --project <k> <v>` | Set project preference | `ctx pref set --project db "sqlite"` |
| `ctx pref list` | List preferences | `ctx pref list` |
| `ctx pref remove <k>` | Remove preference | `ctx pref remove style` |
| `ctx save <name>` | Save context profile | `ctx save apc-core` |
| `ctx load <name>` | Load and output profile | `ctx load apc-core` |
| `ctx profiles` | List saved profiles | `ctx profiles` |
| `ctx delete <name>` | Delete profile | `ctx delete apc-core` |

---

## Data Models

### config.json (Global Preferences)
```json
{
  "version": 1,
  "preferences": {
    "style": "functional, immutable, minimal comments",
    "typescript": "strict mode, explicit types, no any",
    "testing": "vitest, unit tests for all modules"
  },
  "defaults": {
    "compact": false,
    "recentFiles": 3,
    "maxFileSize": 10000
  }
}
```

### Project Preferences (projects/<hash>.json)
```json
{
  "projectPath": "~/code/projects/auto-prompt-complete",
  "preferences": {
    "constraints": "local-first, no cloud dependencies",
    "architecture": "daemon + CLI + integrations"
  },
  "updatedAt": "2026-02-06T12:00:00Z"
}
```

### Profile (profiles/<name>.json)
```json
{
  "name": "apc-core",
  "projectPath": "~/code/projects/auto-prompt-complete",
  "files": ["src/types.ts", "src/core/Completer.ts"],
  "notes": "Working on completion engine",
  "createdAt": "2026-02-06T12:00:00Z"
}
```

### TypeScript Types
```typescript
// src/types.ts

export interface DetectedStack {
  language: string;           // "TypeScript", "Python", etc.
  runtime?: string;           // "Node.js 20", "Python 3.12"
  framework?: string;         // "React", "FastAPI"
  tools: string[];            // ["ESLint", "mypy", "ruff"]
  packageManager?: string;    // "npm", "uv", "cargo"
}

export interface GitStatus {
  branch: string;
  clean: boolean;
  uncommittedCount: number;
  remote?: string;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: Date;
  content?: string;           // Only if requested
}

export interface DirectoryStructure {
  name: string;
  children: (DirectoryStructure | string)[];  // string = file
  fileCount: number;
}

export interface ProjectContext {
  name: string;
  path: string;
  stack: DetectedStack;
  git?: GitStatus;
  structure: DirectoryStructure;
  recentFiles: FileInfo[];
  includedFiles: FileInfo[];
}

export interface Preferences {
  global: Record<string, string>;
  project: Record<string, string>;
}

export interface ContextOutput {
  project: ProjectContext;
  preferences: Preferences;
  prompt?: string;
}

export interface Profile {
  name: string;
  projectPath: string;
  files: string[];
  notes?: string;
  createdAt: Date;
}
```

---

## Context Generation

### Output Format

```xml
<context>
Project: auto-prompt-complete
Path: ~/code/projects/auto-prompt-complete

Stack:
  Language: TypeScript
  Runtime: Node.js 20
  Tools: ESLint, Prettier

Git:
  Branch: main
  Status: clean

Structure:
  src/
    embedding/
    vector/
    storage/
    core/
    daemon/
    cli/
  tests/
  package.json
  SPEC.md

Recent Files:
  - src/types.ts (modified 2h ago)
  - src/core/Completer.ts (modified today)

Preferences:
  style: functional, immutable
  typescript: strict mode, explicit types

</context>

[Prompt if provided]
```

### Compact Format

```xml
<context>
auto-prompt-complete | TypeScript/Node.js | main (clean)
src/{embedding,vector,storage,core,daemon,cli}, tests, SPEC.md
Style: functional | TS: strict
</context>
```

### With File Contents

```xml
<context>
Project: auto-prompt-complete
...

<files>
--- src/types.ts ---
export interface Prompt {
  id: number;
  text: string;
  ...
}
---

--- SPEC.md (truncated) ---
# ctx: Comprehensive Project Specification
...
---
</files>
</context>
```

---

## Integration Points

### Pipe to AI Tools

```bash
# Codex CLI
ctx | codex "implement the EmbeddingEngine"

# Claude CLI
ctx | claude "review this architecture"

# Aider
ctx | aider

# Goose
ctx | goose

# Generic (any tool that reads stdin)
ctx | some-ai-tool
```

### With Prompt Inline

```bash
# Append prompt after context
ctx --prompt "implement EmbeddingEngine" | codex

# Equivalent to:
# <context>...</context>
# 
# implement EmbeddingEngine
```

### Clipboard Workflow

```bash
# Copy context to clipboard
ctx --copy

# Then paste into ChatGPT, Claude web, etc.
```

### Shell Function Integration

```bash
# Add to ~/.zshrc
function ai() {
  ctx --prompt "$*" | codex
}

# Usage
$ ai implement the EmbeddingEngine class
```

---

## Testing Requirements

### Unit Tests
- Detector: test each language detection
- Collector: test file/git collection
- Formatter: test output generation
- Config: test read/write operations

### Integration Tests
- Full flow: detect → collect → format
- Preferences included in output
- Profiles save and load correctly

### Edge Cases
- Not a git repository
- Empty directory
- Very large project (>1000 files)
- Binary files (should skip)
- Permission denied files

---

## Success Criteria

### MVP (Phase 1 Complete)
- [ ] `ctx` outputs useful context
- [ ] Stack detection works for TypeScript + Python
- [ ] File inclusion works
- [ ] Tests pass

### Full Feature (Phase 2-3 Complete)
- [ ] Preferences stored and included
- [ ] Profiles save and load
- [ ] All CLI commands work

### Personal Success (1-Week Trial)
- [ ] Used `ctx` in 10+ AI conversations
- [ ] Saved 3+ profiles
- [ ] Noticed time savings vs manual context

---

## Constraints & Non-Goals

### Constraints
1. **Stdout-focused**: Primary output is text to stdout
2. **No daemon**: Simple CLI, no background process
3. **Local-only**: No cloud, no sync
4. **Fast**: <500ms for typical project

### Non-Goals
1. ❌ AI-powered summarization (just formats, doesn't analyze)
2. ❌ Automatic prompt generation
3. ❌ Chat history tracking
4. ❌ Tool-specific integrations (just outputs text)
5. ❌ Multi-project context (one project at a time)
6. ❌ GUI

---

## Comparison to Alternatives

| Feature | ctx | Manual copy-paste | Tool-specific context |
|---------|-----|-------------------|----------------------|
| Speed | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Consistency | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| Cross-tool | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| Customizable | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Learning curve | Low | None | Medium |

**ctx wins because:** Works with ANY AI tool, remembers preferences, consistent output.

---

## Future Ideas (Post-MVP)

If ctx proves valuable, consider:
- **Semantic file selection**: "include files related to authentication"
- **Token counting**: Show estimated token count
- **Template system**: Custom context formats
- **Integration with auto-prompt-complete**: Share context with prompt suggestions

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-06 | Initial | Created specification |

---

*End of specification*
