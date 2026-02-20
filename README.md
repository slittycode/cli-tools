# mood

A TypeScript ESM CLI that checks the "vibe" of a software project.

Instead of a typical mechanical status report, `mood` gathers quick signals about your project and feeds them to Claude (via AWS Bedrock) to generate a casual, 2-3 sentence project weather report.

## Usage

```bash
# Ensure AWS credentials are in your environment, e.g. via SSO
export AWS_REGION=us-east-1
export AWS_PROFILE=slittycodes

# Run from any git project directory
mood
```

## How it works

1. Evaluates your current Git branch and working tree status.
2. Checks uncommitted changes and the age/message of your last commit.
3. Does a fast scan for `TODO/FIXME/HACK` markers across your tracked files.
4. Identifies the project type (e.g., Node, Python, Rust, Go).
5. Sends these signals to `us.anthropic.claude-3-5-sonnet-20241022-v2:0` via AWS Bedrock.
6. Streams the response directly into your terminal.

## Philosophy
`mood` fails fast: if git is slow, or you aren't in a git repository, or your AWS credentials are missing, it immediately exits rather than hanging. It gives you an instant snapshot of the project's feeling.
