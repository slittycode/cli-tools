#!/usr/bin/env node
/**
 * ask — universal AI prompt dispatcher
 *
 * Routes a prompt to your preferred available AI agent, automatically
 * injecting project context via `ctx` so you never re-explain your stack.
 *
 * Usage:
 *   ask "explain this error" < error.log
 *   cat src/auth.ts | ask "what's wrong here?"
 *   ask --agent ollama:qwen2.5 "translate this to Python"
 *   ask --all "is this pattern safe?" < code.ts
 *   ask --status
 */
import { Command } from 'commander';
import { detectAgents } from '../detect.js';
import { resolveAgent, resolveAllAgents } from '../router.js';
import { buildPrompt } from '../context.js';
import { AskError, ErrorCode } from '../errors.js';
import { validateAgentFlag, validatePrompt, validateSystemPrompt, validateStdinSize, } from '../validate.js';
import { STDIN_TIMEOUT_MS } from '../config.js';
import { printStatus, printAgentHeader, printRouting, printDivider, writeChunk, printStreamEnd, printAgentError, printNoPrompt, } from '../renderer.js';
/**
 * Read all of stdin with a hard size cap and a timeout guard.
 * Returns empty string when stdin is an interactive TTY.
 */
async function readStdin() {
    if (process.stdin.isTTY)
        return '';
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        const timer = setTimeout(() => {
            reject(new AskError(ErrorCode.STDIN_TIMEOUT, `stdin did not complete within ${STDIN_TIMEOUT_MS / 1000}s`));
        }, STDIN_TIMEOUT_MS);
        const cleanup = () => clearTimeout(timer);
        process.stdin.on('data', (chunk) => {
            totalBytes += chunk.byteLength;
            try {
                validateStdinSize(totalBytes);
            }
            catch (err) {
                cleanup();
                reject(err);
                return;
            }
            chunks.push(chunk);
        });
        process.stdin.on('end', () => {
            cleanup();
            resolve(Buffer.concat(chunks).toString('utf8').trim());
        });
        process.stdin.on('error', (err) => {
            cleanup();
            reject(new AskError(ErrorCode.STDIN_TIMEOUT, `stdin error: ${err.message}`));
        });
    });
}
async function main() {
    const program = new Command();
    program
        .name('ask')
        .description('Universal AI prompt dispatcher')
        .version('0.1.0')
        .argument('[prompt]', 'Prompt to send (also reads from stdin)')
        .option('-a, --agent <id[:model]>', 'Pin to a specific agent, e.g. ollama:qwen2.5')
        .option('--all', 'Query all available agents', false)
        .option('--status', 'Show agent availability and exit', false)
        .option('--no-context', 'Skip ctx project context injection')
        .option('-s, --system <text>', 'Override system prompt')
        .parse(process.argv);
    const opts = program.opts();
    const args = program.args;
    // ── Validate --agent flag early (fail fast before any I/O) ───────────────
    if (opts.agent) {
        try {
            validateAgentFlag(opts.agent);
        }
        catch (err) {
            process.stderr.write(`Error: ${err instanceof AskError ? err.message : String(err)}\n`);
            process.exit(1);
        }
    }
    // ── Validate --system length ──────────────────────────────────────────────
    let system;
    if (opts.system) {
        try {
            system = validateSystemPrompt(opts.system);
        }
        catch (err) {
            process.stderr.write(`Error: ${err instanceof AskError ? err.message : String(err)}\n`);
            process.exit(1);
        }
    }
    const options = {
        prompt: args[0],
        agent: opts.agent,
        all: opts.all,
        status: opts.status,
        // Commander converts --no-context to opts.context = false
        noContext: !opts.context,
        system,
    };
    // ── Status mode ───────────────────────────────────────────────────────────
    if (options.status) {
        const agents = await detectAgents();
        printStatus(agents);
        return;
    }
    // ── Collect prompt from CLI arg + stdin ───────────────────────────────────
    let stdinContent;
    try {
        stdinContent = await readStdin();
    }
    catch (err) {
        process.stderr.write(`Error: ${err instanceof AskError ? err.message : String(err)}\n`);
        process.exit(1);
    }
    let rawPrompt = options.prompt ?? '';
    if (stdinContent) {
        rawPrompt = rawPrompt ? `${rawPrompt}\n\n${stdinContent}` : stdinContent;
    }
    if (!rawPrompt.trim()) {
        printNoPrompt();
        process.exit(1);
    }
    // ── Validate prompt (warns on large input, rejects empty) ─────────────────
    try {
        validatePrompt(rawPrompt);
    }
    catch (err) {
        if (err instanceof AskError && err.code === ErrorCode.EMPTY_PROMPT) {
            printNoPrompt();
            process.exit(1);
        }
    }
    // ── Build final prompt (with optional ctx context) ────────────────────────
    const prompt = buildPrompt(rawPrompt, {
        injectContext: !options.noContext,
    });
    const askOpts = {
        system: options.system,
        stream: true,
    };
    // ── --all mode: query every available agent sequentially ──────────────────
    if (options.all) {
        let agents;
        try {
            agents = await resolveAllAgents();
        }
        catch (err) {
            process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
            process.exit(1);
        }
        if (agents.length === 0) {
            process.stderr.write('No agents available. Run `ask --status` for details.\n');
            process.exit(1);
        }
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            printAgentHeader(agent.info);
            try {
                for await (const chunk of agent.ask(prompt, askOpts)) {
                    writeChunk(chunk);
                }
                printStreamEnd();
            }
            catch (err) {
                printAgentError(agent.info, err);
            }
            // One agent failing must not abort the rest in --all mode
            if (i < agents.length - 1)
                printDivider();
        }
        return;
    }
    // ── Single-agent mode ─────────────────────────────────────────────────────
    try {
        const agent = await resolveAgent(options.agent);
        printRouting(agent.info);
        for await (const chunk of agent.ask(prompt, askOpts)) {
            writeChunk(chunk);
        }
        printStreamEnd();
    }
    catch (err) {
        process.stderr.write(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=main.js.map