import { describe, it, expect } from 'vitest';
import { runChecks } from '../src/runner.js';
import type { Check, CheckResult } from '../src/types.js';
import { Status } from '../src/types.js';

function makeCheck(name: string, result: CheckResult): Check {
  return { name, run: async () => result };
}

function makeThrowingCheck(name: string): Check {
  return {
    name,
    run: async () => {
      throw new Error('check exploded');
    },
  };
}

describe('runChecks', () => {
  it('returns results for all checks', async () => {
    const checks = [
      makeCheck('A', { name: 'A', status: Status.Pass, summary: 'ok', details: [] }),
      makeCheck('B', { name: 'B', status: Status.Warn, summary: 'iffy', details: [] }),
    ];
    const result = await runChecks(checks, '/tmp');
    expect(result.results).toHaveLength(2);
    expect(result.results[0]?.status).toBe(Status.Pass);
    expect(result.results[1]?.status).toBe(Status.Warn);
  });

  it('skips a check by name (case-insensitive)', async () => {
    const checks = [
      makeCheck('Git Status', { name: 'Git Status', status: Status.Pass, summary: 'ok', details: [] }),
    ];
    const result = await runChecks(checks, '/tmp', ['git status']);
    expect(result.results[0]?.status).toBe(Status.Skip);
    expect(result.results[0]?.summary).toBe('Skipped');
  });

  it('converts a thrown error into a Fail result', async () => {
    const checks = [makeThrowingCheck('Bomb')];
    const result = await runChecks(checks, '/tmp');
    expect(result.results[0]?.status).toBe(Status.Fail);
    expect(result.results[0]?.summary).toMatch('check exploded');
  });

  it('counts statuses correctly', async () => {
    const checks = [
      makeCheck('A', { name: 'A', status: Status.Pass, summary: '', details: [] }),
      makeCheck('B', { name: 'B', status: Status.Pass, summary: '', details: [] }),
      makeCheck('C', { name: 'C', status: Status.Warn, summary: '', details: [] }),
      makeCheck('D', { name: 'D', status: Status.Fail, summary: '', details: [] }),
    ];
    const result = await runChecks(checks, '/tmp');
    expect(result.counts.pass).toBe(2);
    expect(result.counts.warn).toBe(1);
    expect(result.counts.fail).toBe(1);
    expect(result.counts.skip).toBe(0);
  });

  it('returns the root path in the result', async () => {
    const result = await runChecks([], '/my/project');
    expect(result.root).toBe('/my/project');
  });
});
