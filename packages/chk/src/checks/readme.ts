import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

const README_NAMES = ['README.md', 'README', 'README.txt', 'readme.md', 'Readme.md'];

export const readmeCheck: Check = {
  name: 'README',
  async run(root: string): Promise<CheckResult> {
    for (const name of README_NAMES) {
      const filePath = path.join(root, name);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.size > 10) {
          return {
            name: this.name,
            status: Status.Pass,
            summary: 'Present',
            details: [`${name} (${stat.size} bytes)`],
          };
        }
        return {
          name: this.name,
          status: Status.Warn,
          summary: 'Empty',
          details: [`${name} exists but is nearly empty`],
        };
      }
    }
    return {
      name: this.name,
      status: Status.Fail,
      summary: 'Missing',
      details: ['No README found in project root'],
    };
  },
};
