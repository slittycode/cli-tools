/**
 * Claude Code CLI agent
 * Spawns the `claude` binary and streams its stdout.
 *
 * Invocation: `claude -p "<prompt>"` (non-interactive mode)
 * Docs: https://docs.anthropic.com/en/docs/claude-code/cli-reference
 */
import { Agent, AgentInfo, AskOptions } from '../types.js';
export declare class ClaudeCliAgent implements Agent {
    info: AgentInfo;
    constructor(info: AgentInfo);
    ask(prompt: string, opts?: AskOptions): AsyncGenerator<string>;
}
//# sourceMappingURL=claude-cli.d.ts.map