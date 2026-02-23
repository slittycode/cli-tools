import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

const LICENSE_NAMES = [
  'LICENSE', 'LICENSE.md', 'LICENSE.txt',
  'LICENCE', 'LICENCE.md', 'LICENCE.txt',
  'license', 'license.md', 'license.txt',
];

export const licenseCheck: Check = {
  name: 'License',
  async run(root: string): Promise<CheckResult> {
    // Check for a license file
    for (const name of LICENSE_NAMES) {
      if (fs.existsSync(path.join(root, name))) {
        return {
          name: this.name,
          status: Status.Pass,
          summary: 'Present',
          details: [`License file: ${name}`],
        };
      }
    }

    // Check package.json for license field
    const pkgPath = path.join(root, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.license) {
          return {
            name: this.name,
            status: Status.Warn,
            summary: `${pkg.license} (no file)`,
            details: ['License declared in package.json but no LICENSE file'],
          };
        }
      } catch {
        // invalid JSON, skip
      }
    }

    // Check Cargo.toml for license field
    const cargoPath = path.join(root, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      try {
        const content = fs.readFileSync(cargoPath, 'utf-8');
        const match = content.match(/^license\s*=\s*"(.+)"/m);
        if (match?.[1]) {
          return {
            name: this.name,
            status: Status.Warn,
            summary: `${match[1]} (no file)`,
            details: ['License declared in Cargo.toml but no LICENSE file'],
          };
        }
      } catch {
        // skip
      }
    }

    return {
      name: this.name,
      status: Status.Fail,
      summary: 'Missing',
      details: ['No license file or declaration found'],
    };
  },
};
