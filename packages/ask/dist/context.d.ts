/**
 * Project context injection via `ctx`
 *
 * Attempts to call `ctx generate` in the current directory to prepend
 * structured project context to every prompt. Fails silently — if ctx
 * isn't installed, not in a git repo, or errors out, the prompt is sent as-is.
 */
/**
 * Try to generate project context using the ctx CLI.
 * Returns the formatted block or null if ctx is unavailable/fails.
 */
export declare function getProjectContext(cwd?: string): string | null;
/**
 * Prepend project context to a prompt string.
 * Pass injectContext=false to skip (--no-context flag).
 */
export declare function buildPrompt(userPrompt: string, opts: {
    injectContext: boolean;
    cwd?: string;
}): string;
//# sourceMappingURL=context.d.ts.map