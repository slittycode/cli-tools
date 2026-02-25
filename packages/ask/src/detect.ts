/**
 * Agent auto-detection
 * Probes the environment for available AI agents without side effects.
 */

import { execSync, execFileSync } from 'child_process';
import { AgentInfo, AgentId } from './types.js';

/** Silently test if a binary exists in PATH */
function hasBinary(name: string): boolean {
  try {
    execFileSync('which', [name], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Check if Ollama daemon is reachable */
async function ollamaRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Get list of pulled Ollama models */
async function ollamaModels(): Promise<string[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}

/** Check if AWS Bedrock credentials are present */
function hasAwsCredentials(): boolean {
  const hasKeys =
    !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
  const hasProfile = !!process.env.AWS_PROFILE;
  if (hasKeys || hasProfile) return true;
  // Check ~/.aws/credentials exists
  try {
    execSync('test -f ~/.aws/credentials || test -f ~/.aws/config', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Check if a Google API key is present or gemini CLI is available */
function hasGeminiAccess(): { ok: boolean; via: string } {
  if (process.env.GOOGLE_API_KEY) return { ok: true, via: 'GOOGLE_API_KEY' };
  if (process.env.GEMINI_API_KEY) return { ok: true, via: 'GEMINI_API_KEY' };
  if (hasBinary('gemini')) return { ok: true, via: 'gemini CLI' };
  if (hasBinary('gcloud')) {
    // gcloud present but no key — available but needs auth
    return { ok: false, via: 'gcloud (no API key set)' };
  }
  return { ok: false, via: 'none' };
}

/**
 * Detect all agents and return their availability info.
 * This is the authoritative probe — run once at startup.
 */
export async function detectAgents(): Promise<AgentInfo[]> {
  const results: AgentInfo[] = [];

  // ── Claude Code CLI ──────────────────────────────────────────────────────
  const claudeOk = hasBinary('claude');
  results.push({
    id: 'claude-cli',
    name: 'Claude Code',
    via: 'claude CLI',
    available: claudeOk,
    reason: claudeOk ? undefined : '`claude` binary not found — install from https://claude.ai/code',
  });

  // ── AWS Bedrock ──────────────────────────────────────────────────────────
  const bedrockOk = hasAwsCredentials();
  results.push({
    id: 'bedrock',
    name: 'AWS Bedrock (Claude)',
    via: process.env.AWS_PROFILE
      ? `AWS profile: ${process.env.AWS_PROFILE}`
      : process.env.AWS_ACCESS_KEY_ID
      ? 'AWS_ACCESS_KEY_ID'
      : '~/.aws/credentials',
    available: bedrockOk,
    reason: bedrockOk ? undefined : 'No AWS credentials found (set AWS_PROFILE or AWS_ACCESS_KEY_ID)',
  });

  // ── OpenAI / ChatGPT ─────────────────────────────────────────────────────
  const openAiKey = !!process.env.OPENAI_API_KEY;
  results.push({
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    via: openAiKey ? 'OPENAI_API_KEY' : 'no key',
    available: openAiKey,
    model: process.env.ASK_OPENAI_MODEL ?? 'gpt-4o',
    reason: openAiKey
      ? undefined
      : 'Set OPENAI_API_KEY — get one at https://platform.openai.com/api-keys',
  });

  // ── Google Gemini ────────────────────────────────────────────────────────
  const gemini = hasGeminiAccess();
  results.push({
    id: 'gemini',
    name: 'Google Gemini',
    via: gemini.via,
    available: gemini.ok,
    reason: gemini.ok ? undefined : 'Set GOOGLE_API_KEY or install the gemini CLI',
  });

  // ── Ollama (local — includes Qwen, Llama, Mistral, etc.) ─────────────────
  const ollamaOk = await ollamaRunning();
  const models = ollamaOk ? await ollamaModels() : [];
  const qwenModel = models.find((m) => m.toLowerCase().startsWith('qwen'));
  results.push({
    id: 'ollama',
    name: 'Ollama (local LLM)',
    via: ollamaOk
      ? `localhost:11434 — ${models.length} model(s) available`
      : 'localhost:11434',
    available: ollamaOk && models.length > 0,
    model: qwenModel ?? models[0],
    reason: !ollamaOk
      ? 'Ollama not running — start with `ollama serve`'
      : models.length === 0
      ? 'No models pulled — try `ollama pull qwen2.5` or `ollama pull llama3`'
      : undefined,
  });

  // ── Cline ────────────────────────────────────────────────────────────────
  results.push({
    id: 'cline',
    name: 'Cline',
    via: 'VS Code extension',
    available: false,
    reason: 'Cline is a VS Code extension — use it inside the editor, not from the terminal',
  });

  return results;
}

/** Convenience: return only available agents (excluding VS Code-only ones) */
export async function availableAgents(): Promise<AgentInfo[]> {
  const all = await detectAgents();
  return all.filter((a) => a.available && a.id !== 'cline');
}

/** Look up a single agent by id */
export async function getAgentInfo(id: AgentId): Promise<AgentInfo | undefined> {
  const all = await detectAgents();
  return all.find((a) => a.id === id);
}
