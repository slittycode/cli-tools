import { simpleGit } from "simple-git";
import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";

export interface ProjectSignals {
  branch: string | null;
  isClean: boolean | null;
  uncommittedCount: number | null;
  lastCommitAge: string | null;
  lastCommitMessage: string | null;
  todoCount: number | null;
  projectType: string | null;
  gitTimedOut?: boolean;
}

const MANIFEST_FILES: Record<string, string> = {
  "package.json": "Node",
  "Cargo.toml": "Rust",
  "pyproject.toml": "Python",
  "go.mod": "Go",
};

const TODO_PATTERN = /\b(TODO|FIXME|HACK)\b/;
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".o", ".a",
  ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac",
  ".wasm", ".pyc", ".class",
]);

export function formatAge(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function collectGitSignals(
  cwd: string,
): Promise<Pick<ProjectSignals, "branch" | "isClean" | "uncommittedCount" | "lastCommitAge" | "lastCommitMessage">> {
  const git = simpleGit(cwd);

  const [statusResult, logResult] = await Promise.all([
    withTimeout(git.status(), 500),
    withTimeout(git.log({ maxCount: 1 }), 500),
  ]);

  if (!statusResult) {
    return {
      branch: null,
      isClean: null,
      uncommittedCount: null,
      lastCommitAge: null,
      lastCommitMessage: null,
    };
  }

  const branch = statusResult.current;
  const isClean = statusResult.isClean();
  const uncommittedCount =
    statusResult.modified.length +
    statusResult.staged.length +
    statusResult.not_added.length;

  let lastCommitAge: string | null = null;
  let lastCommitMessage: string | null = null;
  if (logResult?.latest?.date) {
    lastCommitAge = formatAge(new Date(logResult.latest.date));
    lastCommitMessage = logResult.latest.message;
  }

  return { branch, isClean, uncommittedCount, lastCommitAge, lastCommitMessage };
}

function isBinary(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

async function countTodos(cwd: string): Promise<number | null> {
  try {
    const git = simpleGit(cwd);
    const raw = await git.raw(["ls-files"]);
    const allFiles = raw.split("\n").filter(Boolean);

    const files = allFiles
      .filter((f) => !f.startsWith("node_modules/") && !isBinary(f))
      .slice(0, 1000);

    let count = 0;
    for (const file of files) {
      try {
        const content = await readFile(join(cwd, file), "utf-8");
        for (const line of content.split("\n")) {
          if (TODO_PATTERN.test(line)) count++;
        }
      } catch {
        // skip unreadable files
      }
    }
    return count;
  } catch {
    return null;
  }
}

async function detectProjectType(cwd: string): Promise<string | null> {
  for (const [file, type] of Object.entries(MANIFEST_FILES)) {
    try {
      await access(join(cwd, file));
      return `${type} (${file})`;
    } catch {
      // not found, continue
    }
  }
  return null;
}

export async function collectSignals(cwd: string): Promise<ProjectSignals> {
  const [gitSignals, todoCount, projectType] = await Promise.all([
    collectGitSignals(cwd),
    countTodos(cwd),
    detectProjectType(cwd),
  ]);

  return {
    ...gitSignals,
    ...(gitSignals.branch === null ? { gitTimedOut: true } : {}),
    todoCount,
    projectType,
  };
}

export function formatSignalsMessage(signals: ProjectSignals): string {
  const parts: string[] = [];

  if (signals.gitTimedOut) {
    parts.push("Git data unavailable (timed out).");
  } else {
    if (signals.branch) {
      const cleanStatus = signals.isClean
        ? "clean working tree"
        : `${signals.uncommittedCount} uncommitted change${signals.uncommittedCount === 1 ? "" : "s"}`;
      parts.push(`Branch "${signals.branch}", ${cleanStatus}.`);
    }

    if (signals.lastCommitAge) {
      const msg = signals.lastCommitMessage
        ? `: "${signals.lastCommitMessage}"`
        : "";
      parts.push(`Last commit ${signals.lastCommitAge}${msg}.`);
    }
  }

  if (signals.todoCount !== null && signals.todoCount > 0) {
    parts.push(
      `${signals.todoCount} TODO/FIXME/HACK marker${signals.todoCount === 1 ? "" : "s"} across tracked files.`,
    );
  } else if (signals.todoCount === 0) {
    parts.push("No TODO/FIXME/HACK markers found.");
  }

  if (signals.projectType) {
    parts.push(`${signals.projectType} project.`);
  }

  return parts.join(" ");
}
