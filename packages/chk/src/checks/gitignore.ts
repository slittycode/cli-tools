import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

interface StackExpectation {
  /** File that indicates this stack is present */
  indicator: string;
  /** Entries that should be in .gitignore */
  expected: string[];
}

const STACKS: StackExpectation[] = [
  { indicator: 'package.json', expected: ['node_modules', '.env'] },
  { indicator: 'Pipfile', expected: ['__pycache__', '.venv', '.env'] },
  { indicator: 'requirements.txt', expected: ['__pycache__', '.venv', '.env'] },
  { indicator: 'Cargo.toml', expected: ['target'] },
  { indicator: 'go.mod', expected: [] },
  { indicator: 'composer.json', expected: ['vendor', '.env'] },
];

export const gitignoreCheck: Check = {
  name: 'Gitignore',
  async run(root: string): Promise<CheckResult> {
    const gitignorePath = path.join(root, '.gitignore');
    const details: string[] = [];

    if (!fs.existsSync(gitignorePath)) {
      return {
        name: this.name,
        status: Status.Fail,
        summary: 'Missing',
        details: ['No .gitignore file found'],
      };
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

    // Figure out what stack we're dealing with
    const missing: string[] = [];
    for (const stack of STACKS) {
      if (fs.existsSync(path.join(root, stack.indicator))) {
        for (const entry of stack.expected) {
          const covered = lines.some((l) => l === entry || l === `${entry}/` || l.startsWith(`${entry}/`));
          if (!covered) {
            missing.push(entry);
          }
        }
      }
    }

    if (missing.length > 0) {
      for (const m of missing) details.push(`Missing: ${m}`);
      return {
        name: this.name,
        status: Status.Warn,
        summary: `${missing.length} missing`,
        details,
      };
    }

    details.push(`${lines.length} rules configured`);
    return {
      name: this.name,
      status: Status.Pass,
      summary: 'Configured',
      details,
    };
  },
};
