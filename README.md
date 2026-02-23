# cli-tools

Personal CLI toolkit. All tools are local-first, terminal-native, and fast.

## Tools

| Tool | Description | Docs |
|------|-------------|------|
| [chk](packages/chk) | Traffic-light project health check | [AGENTS.md](packages/chk/AGENTS.md) |
| [ctx](packages/ctx) | Capture project context for AI tools | [AGENTS.md](packages/ctx/AGENTS.md) |
| [vibe](packages/vibe) | AI-powered git activity summary | [README](packages/vibe/README.md) |
| [mood](packages/mood) | Quick project mood check via Claude | [README](packages/mood/README.md) |

## Usage

```bash
# Install all tools globally from workspace root
npm run build
npm link --workspaces

# Or use each tool directly
node packages/chk/dist/cli/main.js
node packages/ctx/dist/cli/main.js
```

## Development

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Test all packages
npm test

# Work on a single package
cd packages/chk
npm test
```
