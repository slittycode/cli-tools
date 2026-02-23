import * as os from 'node:os';
import * as path from 'node:path';
import type { ContextOutput, DirectoryStructure } from '../types.js';

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  // Check same calendar day
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return 'today';
  }

  // Check yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'yesterday';
  }

  if (diffDays < 7) return `${diffDays}d ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function shortenPath(p: string): string {
  const home = os.homedir();
  return p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

function renderTree(node: DirectoryStructure, indent = 2): string {
  const lines: string[] = [];
  const pad = ' '.repeat(indent);

  for (const child of node.children) {
    if (typeof child === 'string') {
      lines.push(`${pad}${child}`);
    } else {
      lines.push(`${pad}${child.name}/`);
      lines.push(renderTree(child, indent + 2));
    }
  }
  return lines.filter((l) => l.trim() !== '').join('\n');
}

export function format(output: ContextOutput, compact = false): string {
  const { project, preferences, prompt } = output;
  const { stack, git, structure, recentFiles, includedFiles } = project;

  if (compact) {
    const parts: string[] = [];

    // Line 1: project | language/runtime | branch (status)
    const langRuntime = stack.runtime
      ? `${stack.language}/${stack.runtime}`
      : stack.language;
    const gitPart = git
      ? `${git.branch} (${git.clean ? 'clean' : `${git.uncommittedCount} uncommitted`})`
      : '';
    const line1 = [project.name, langRuntime, gitPart].filter(Boolean).join(' | ');
    parts.push(line1);

    // Line 2: top-level entries
    const topLevel = structure.children
      .map((c) => (typeof c === 'string' ? c : `${c.name}/`))
      .join(', ');
    if (topLevel) parts.push(topLevel);

    // Line 3: prefs as key: val | key: val
    const allPrefs = { ...preferences.global, ...preferences.project };
    const prefLine = Object.entries(allPrefs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    if (prefLine) parts.push(prefLine);

    return `<context>\n${parts.join('\n')}\n</context>${prompt ? `\n\n${prompt}` : ''}`;
  }

  // Full format
  const sections: string[] = [];

  // Header
  sections.push(`Project: ${project.name}`);
  sections.push(`Path: ${shortenPath(project.path)}`);

  // Stack
  const stackLines: string[] = [];
  stackLines.push(`  Language: ${stack.language}`);
  if (stack.runtime) stackLines.push(`  Runtime: ${stack.runtime}`);
  if (stack.framework) stackLines.push(`  Framework: ${stack.framework}`);
  if (stack.tools.length > 0) stackLines.push(`  Tools: ${stack.tools.join(', ')}`);
  if (stack.packageManager) stackLines.push(`  Package Manager: ${stack.packageManager}`);
  if (stackLines.length > 0) {
    sections.push(`\nStack:\n${stackLines.join('\n')}`);
  }

  // Git
  if (git) {
    const status = git.clean ? 'clean' : `${git.uncommittedCount} uncommitted files`;
    sections.push(`\nGit:\n  Branch: ${git.branch}\n  Status: ${status}`);
  }

  // Structure
  const treeStr = renderTree(structure);
  if (treeStr) {
    sections.push(`\nStructure:\n${treeStr}`);
  }

  // Recent files
  if (recentFiles.length > 0) {
    const recentLines = recentFiles
      .map((f) => `  - ${f.relativePath} (modified ${formatRelativeTime(f.modifiedAt)})`)
      .join('\n');
    sections.push(`\nRecent Files:\n${recentLines}`);
  }

  // Preferences
  const allPrefs = { ...preferences.global, ...preferences.project };
  if (Object.keys(allPrefs).length > 0) {
    const prefLines = Object.entries(allPrefs)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');
    sections.push(`\nPreferences:\n${prefLines}`);
  }

  let body = `<context>\n${sections.join('\n')}\n`;

  // Included files
  if (includedFiles.length > 0) {
    const fileBlocks = includedFiles
      .map((f) => {
        const label = f.content?.includes('[truncated') ? ` (truncated)` : '';
        return `--- ${f.relativePath}${label} ---\n${f.content ?? ''}\n---`;
      })
      .join('\n\n');
    body += `\n<files>\n${fileBlocks}\n</files>\n`;
  }

  body += '</context>';

  if (prompt) body += `\n\n${prompt}`;

  return body;
}

export function formatJson(output: ContextOutput): string {
  return JSON.stringify(
    {
      project: {
        name: output.project.name,
        path: output.project.path,
        stack: output.project.stack,
        git: output.project.git,
        recentFiles: output.project.recentFiles.map((f) => ({
          relativePath: f.relativePath,
          modifiedAt: f.modifiedAt.toISOString(),
          size: f.size,
        })),
      },
      preferences: output.preferences,
      ...(output.prompt !== undefined && { prompt: output.prompt }),
    },
    null,
    2,
  );
}

export function renderDirectoryTree(structure: DirectoryStructure): string {
  return renderTree(structure);
}

// Helper to build the project path from cwd
export function resolveProjectPath(cwd: string): string {
  return path.resolve(cwd);
}
