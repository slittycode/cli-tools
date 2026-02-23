# chk

A lightning-fast, traffic-light health assessment tool for software projects.

`chk` runs a suite of core health checks against your project directory and gives you deterministic feedback about the state of your codebase.

## Usage

```bash
# Run in any project root to get a high-level summary
chk

# Get a detailed breakdown of warnings and errors
chk --verbose

# Get output as JSON for programmatic consumption
chk --json
```

## How it works
The `chk` CLI executes a predefined framework of 8 health checks. It flags critical issues as ✖ (red) and warnings as ▲ (amber). Its core goal is to verify project structure, basic configuration integrity, and dependency existence.

## Philosophy
`chk` is designed to be the objective gatekeeper before beginning new work on a project. It is deterministic, does not hang, runs out of the box with zero configuration, and focuses strictly on answering: "Is it fundamentally broken?"
