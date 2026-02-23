# ctx — Agent Use Cases

`ctx` captures project context and outputs a formatted `<context>` block for AI consumption. It auto-detects stack, reads git status, walks the file structure, and injects stored preferences.

## When to use it

### At the start of a coding session
Run `ctx` in the project root before asking questions or generating code. It gives the model everything it needs to avoid "what stack is this?" and "what's the structure?" back-and-forth.

```bash
ctx
```

Pipe the output into your prompt or paste it as the opening message.

### When switching projects mid-session
Re-run `ctx` after `cd`-ing to a different project. Context from one project does not apply to another.

### When working on a specific subsystem
Include the relevant files so the model has exact types, interfaces, or specs rather than inferring from structure alone.

```bash
ctx --files src/types.ts src/core/Completer.ts
```

Use glob patterns for broader coverage:

```bash
ctx --files "src/auth/**/*.ts"
```

### When the model needs recent change context
Surface recently modified files to focus attention on what's actively in flux:

```bash
ctx --recent 5
```

### When saving a reusable context snapshot
Save profiles for tasks you return to repeatedly:

```bash
ctx save auth-work        # save current context
ctx load auth-work        # restore it next session
ctx profiles              # list all saved profiles
```

### When piping to another AI CLI tool
`ctx` outputs plain text to stdout — works with any tool that reads stdin:

```bash
ctx | codex "implement the EmbeddingEngine"
ctx | claude "review this architecture"
ctx --prompt "implement X" | some-ai-tool
```

### When working across many sessions
Store preferences once so they appear in every context block automatically:

```bash
ctx pref set style "functional, immutable, no classes"
ctx pref set typescript "strict mode, explicit types, no any"
ctx pref set --project constraints "local-first, no cloud dependencies"
```

## Output format

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
    core/
    cli/
  tests/
  package.json

Recent Files:
  - src/types.ts (modified 2h ago)

Preferences:
  style: functional, immutable
  typescript: strict mode, explicit types

</context>
```

## Flags reference

| Flag | Effect |
|------|--------|
| `--files <paths...>` | Include named file contents in output |
| `--recent <n>` | Include n most recently modified files |
| `--compact` | Shorter single-line format |
| `--copy` | Copy output to clipboard instead of stdout |
| `--prompt <text>` | Append a prompt after the context block |
| `--json` | Output as JSON instead of XML-style text |

## Subcommands

| Command | Purpose |
|---------|---------|
| `ctx pref set <k> <v>` | Set a global preference |
| `ctx pref set --project <k> <v>` | Set a project-scoped preference |
| `ctx pref list` | Show all preferences |
| `ctx save <name>` | Save current context as a named profile |
| `ctx load <name>` | Output a saved profile |
| `ctx profiles` | List saved profiles |
| `ctx sync` | Write compact context to `.ctx` file at git root |
