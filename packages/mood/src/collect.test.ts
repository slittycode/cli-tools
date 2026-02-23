import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectSignals, formatAge, formatSignalsMessage } from "./collect.js";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "mood-test-"));
}

function initGitRepo(dir: string): void {
  execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir, stdio: "pipe" });
}

describe("formatAge", () => {
  it("returns 'just now' for very recent dates", () => {
    expect(formatAge(new Date())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatAge(d)).toBe("5 minutes ago");
  });

  it("returns singular minute", () => {
    const d = new Date(Date.now() - 90 * 1000);
    expect(formatAge(d)).toBe("1 minute ago");
  });

  it("returns hours ago", () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatAge(d)).toBe("3 hours ago");
  });

  it("returns days ago", () => {
    const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatAge(d)).toBe("2 days ago");
  });

  it("returns weeks ago", () => {
    const d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(formatAge(d)).toBe("2 weeks ago");
  });

  it("returns months ago", () => {
    const d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(formatAge(d)).toBe("2 months ago");
  });
});

describe("collectSignals", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("collects signals from a git repo with a commit", async () => {
    initGitRepo(dir);
    writeFileSync(join(dir, "hello.ts"), "// TODO: implement\nconsole.log('hi');\n");
    execFileSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["commit", "-m", "initial commit"], { cwd: dir, stdio: "pipe" });

    const signals = await collectSignals(dir);

    expect(signals.branch).toBeTruthy();
    expect(signals.isClean).toBe(true);
    expect(signals.uncommittedCount).toBe(0);
    expect(signals.lastCommitAge).toBe("just now");
    expect(signals.lastCommitMessage).toBe("initial commit");
    expect(signals.todoCount).toBe(1);
    expect(signals.projectType).toBeNull();
  });

  it("counts uncommitted changes", async () => {
    initGitRepo(dir);
    writeFileSync(join(dir, "a.txt"), "first");
    execFileSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "pipe" });

    writeFileSync(join(dir, "a.txt"), "modified");
    writeFileSync(join(dir, "b.txt"), "new");

    const signals = await collectSignals(dir);

    expect(signals.isClean).toBe(false);
    expect(signals.uncommittedCount).toBeGreaterThanOrEqual(2);
  });

  it("detects project type from package.json", async () => {
    initGitRepo(dir);
    writeFileSync(join(dir, "package.json"), "{}");
    execFileSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "pipe" });

    const signals = await collectSignals(dir);
    expect(signals.projectType).toBe("Node (package.json)");
  });

  it("counts multiple TODO/FIXME/HACK markers", async () => {
    initGitRepo(dir);
    writeFileSync(
      join(dir, "code.ts"),
      "// TODO: fix this\n// FIXME: broken\n// HACK: workaround\nconsole.log('ok');\n",
    );
    execFileSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "pipe" });

    const signals = await collectSignals(dir);
    expect(signals.todoCount).toBe(3);
  });
});

describe("formatSignalsMessage", () => {
  it("shapes clean repo signals into prose", () => {
    const msg = formatSignalsMessage({
      branch: "main",
      isClean: true,
      uncommittedCount: 0,
      lastCommitAge: "2 hours ago",
      lastCommitMessage: "fix: align header spacing",
      todoCount: 3,
      projectType: "Node (package.json)",
    });

    expect(msg).toContain('Branch "main"');
    expect(msg).toContain("clean working tree");
    expect(msg).toContain("2 hours ago");
    expect(msg).toContain("fix: align header spacing");
    expect(msg).toContain("3 TODO/FIXME/HACK markers");
    expect(msg).toContain("Node (package.json)");
  });

  it("shapes dirty repo signals into prose", () => {
    const msg = formatSignalsMessage({
      branch: "feature/login",
      isClean: false,
      uncommittedCount: 5,
      lastCommitAge: "3 days ago",
      lastCommitMessage: "wip",
      todoCount: 0,
      projectType: "Rust (Cargo.toml)",
    });

    expect(msg).toContain("5 uncommitted changes");
    expect(msg).toContain("No TODO/FIXME/HACK markers");
  });

  it("handles git timeout gracefully", () => {
    const msg = formatSignalsMessage({
      branch: null,
      isClean: null,
      uncommittedCount: null,
      lastCommitAge: null,
      lastCommitMessage: null,
      todoCount: null,
      projectType: "Python (pyproject.toml)",
      gitTimedOut: true,
    });

    expect(msg).toContain("Git data unavailable");
    expect(msg).toContain("Python");
  });
});
