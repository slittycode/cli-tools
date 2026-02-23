import type { Check, CheckResult, Status } from './types.js';

export interface RunnerResult {
  root: string;
  results: CheckResult[];
  counts: Record<Status, number>;
}

export async function runChecks(
  checks: Check[],
  root: string,
  skip: string[] = [],
): Promise<RunnerResult> {
  const skipSet = new Set(skip.map((s) => s.toLowerCase()));
  const results: CheckResult[] = [];

  for (const check of checks) {
    if (skipSet.has(check.name.toLowerCase())) {
      results.push({
        name: check.name,
        status: 'skip' as Status,
        summary: 'Skipped',
        details: [],
      });
      continue;
    }

    try {
      const result = await check.run(root);
      results.push(result);
    } catch (err) {
      results.push({
        name: check.name,
        status: 'fail' as Status,
        summary: `Error: ${err instanceof Error ? err.message : String(err)}`,
        details: [],
      });
    }
  }

  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 } as Record<Status, number>;
  for (const r of results) {
    counts[r.status]++;
  }

  return { root, results, counts };
}
