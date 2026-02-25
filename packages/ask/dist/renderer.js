/**
 * Terminal output renderer
 * Handles agent headers, streaming output, and the status display.
 */
import { RULE_WIDTH } from './config.js';
// ANSI helpers
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';
function bold(s) { return `${BOLD}${s}${RESET}`; }
function dim(s) { return `${DIM}${s}${RESET}`; }
function green(s) { return `${GREEN}${s}${RESET}`; }
function yellow(s) { return `${YELLOW}${s}${RESET}`; }
function cyan(s) { return `${CYAN}${s}${RESET}`; }
function red(s) { return `${RED}${s}${RESET}`; }
function gray(s) { return `${GRAY}${s}${RESET}`; }
function rule(char = '─') {
    return char.repeat(RULE_WIDTH);
}
/** Print the agent header when streaming begins */
export function printAgentHeader(info) {
    const label = info.id === 'ollama' && info.model
        ? `${info.name}  ${gray(info.model)}`
        : info.name;
    process.stdout.write(`\n${cyan(rule())}\n`);
    process.stdout.write(`${bold(label)}  ${gray(info.via)}\n`);
    process.stdout.write(`${cyan(rule())}\n`);
}
/** Print a separator between --all responses */
export function printDivider() {
    process.stdout.write(`\n${gray(rule('╌'))}\n\n`);
}
/** Stream a chunk to stdout (no newline appended) */
export function writeChunk(chunk) {
    process.stdout.write(chunk);
}
/** Print a newline after streaming completes */
export function printStreamEnd() {
    process.stdout.write('\n');
}
/** Print an error for a specific agent */
export function printAgentError(info, err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n${red('✖')} ${bold(info.name)} failed: ${msg}\n`);
}
/** Print the status table */
export function printStatus(agents) {
    const title = `${bold('ask')} — available agents`;
    process.stdout.write(`\n${title}\n${rule()}\n\n`);
    for (const a of agents) {
        const icon = a.id === 'cline'
            ? yellow('◆')
            : a.available
                ? green('✔')
                : red('✖');
        const name = bold(a.name.padEnd(22));
        const via = dim(a.via);
        process.stdout.write(`  ${icon}  ${name} ${via}\n`);
        if (a.reason) {
            process.stdout.write(`        ${gray(a.reason)}\n`);
        }
        if (a.available && a.id === 'ollama' && a.model) {
            process.stdout.write(`        ${gray(`default model: ${a.model}`)}\n`);
        }
    }
    process.stdout.write('\n');
}
/** Print a brief "routing to" notice before streaming (single-agent mode) */
export function printRouting(info) {
    const label = info.id === 'ollama' && info.model
        ? `${info.name} (${info.model})`
        : info.name;
    process.stderr.write(`${gray(`→ ${label}`)}\n`);
}
/** Print usage hint when no prompt and no stdin */
export function printNoPrompt() {
    process.stderr.write([
        '',
        `${bold('ask')} — universal AI prompt dispatcher`,
        '',
        'Usage:',
        `  ask ${cyan('"your question"')}`,
        `  echo "context" | ask ${cyan('"your question"')}`,
        `  cat file.ts | ask ${cyan('"explain this"')}`,
        '',
        'Options:',
        `  ${yellow('--agent')} <id[:model]>   Pin to a specific agent (claude-cli, bedrock, gemini, ollama:qwen2.5)`,
        `  ${yellow('--all')}                  Query all available agents`,
        `  ${yellow('--status')}               Show agent availability`,
        `  ${yellow('--no-context')}           Skip ctx project context injection`,
        `  ${yellow('--system')} <text>        Override system prompt`,
        '',
    ].join('\n'));
}
//# sourceMappingURL=renderer.js.map