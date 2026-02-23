# chk — Agent Use Cases

`chk` is a traffic-light health check for any project directory. It runs 8 deterministic checks and reports pass / warn / fail in under a second.

## When to run it

### Before starting a coding session
Run `chk` as your first action when asked to work in an unfamiliar or existing project. It surfaces problems that would otherwise waste cycles: missing dependencies, stale build, uncommitted work, secrets in source, missing license.

```bash
chk
```

If anything is red, address it before generating or modifying code.

### Before modifying code
If the project has uncommitted changes (`Git Status: fail`), flag this to the user before writing new files. You may be stomping on in-progress work.

If `Build: warn (Stale)`, remind the user to rebuild after your changes — or run the build yourself if it's part of the task.

### After cloning or pulling
Verify the project is in a runnable state. `Dependencies: warn (not installed)` means `npm install` (or equivalent) needs to run first.

### When debugging unexpected behavior
Unexplained failures are often environmental. Run `chk --verbose` to surface detail lines: which files are untracked, which gitignore entries are missing, which debt markers exist.

### Headless / programmatic use
Use `--json` when you need to parse results rather than display them:

```bash
chk --json
```

Output shape:
```json
{
  "root": "/path/to/project",
  "results": [
    { "name": "Git Status", "status": "pass", "summary": "Clean", "details": [] }
  ],
  "summary": { "pass": 5, "warn": 3, "fail": 0, "skip": 0 }
}
```

### Skipping irrelevant checks
```bash
chk --skip license --skip gitignore
```

## How to interpret results

| Status | Meaning | Action |
|--------|---------|--------|
| `pass` | No issues | Continue |
| `warn` | Minor gap | Note it; proceed with care |
| `fail` | Real problem | Fix before proceeding |
| `skip` | Not applicable | Ignore |

## Checks reference

| Check | Passes when | Warns when | Fails when |
|-------|------------|------------|-----------|
| Git Status | Working tree clean | Untracked files | Uncommitted changes |
| Dependencies | Lock file + install dir present | Lock file present, not installed | Manifest without lock file |
| Debt Markers | 0 TODO/FIXME/HACK/XXX | 1–10 found | >10 found |
| README | README.md present and non-empty | Nearly empty | Missing |
| Environment | No secrets found | `.env.example` exists but `.env` missing | Secret pattern in source |
| Gitignore | All expected entries present | Missing entries for detected stack | No `.gitignore` file |
| Build | `dist/` newer than `src/` | `dist/` empty or older than `src/` | — |
| License | LICENSE file present | License in manifest only, no file | No license found |
