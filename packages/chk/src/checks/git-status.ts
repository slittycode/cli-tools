import { simpleGit } from 'simple-git';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

export const gitStatusCheck: Check = {
  name: 'Git Status',
  async run(root: string): Promise<CheckResult> {
    const git = simpleGit(root);

    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return {
        name: this.name,
        status: Status.Skip,
        summary: 'Not a git repo',
        details: [],
      };
    }

    const status = await git.status();
    const details: string[] = [];

    if (status.modified.length > 0) {
      details.push(`${status.modified.length} modified`);
      for (const f of status.modified) details.push(`  M ${f}`);
    }
    if (status.not_added.length > 0) {
      details.push(`${status.not_added.length} untracked`);
      for (const f of status.not_added) details.push(`  ? ${f}`);
    }
    if (status.staged.length > 0) {
      details.push(`${status.staged.length} staged`);
      for (const f of status.staged) details.push(`  + ${f}`);
    }
    if (status.deleted.length > 0) {
      details.push(`${status.deleted.length} deleted`);
      for (const f of status.deleted) details.push(`  D ${f}`);
    }

    const hasChanges = status.modified.length > 0 || status.staged.length > 0 || status.deleted.length > 0;
    const hasUntracked = status.not_added.length > 0;

    if (!hasChanges && !hasUntracked) {
      return { name: this.name, status: Status.Pass, summary: 'Clean', details };
    }
    if (!hasChanges && hasUntracked) {
      return { name: this.name, status: Status.Warn, summary: `${status.not_added.length} untracked`, details };
    }
    const total = status.modified.length + status.staged.length + status.deleted.length;
    return { name: this.name, status: Status.Fail, summary: `${total} uncommitted`, details };
  },
};
