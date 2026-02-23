import * as fs from 'fs';
import * as path from 'path';
import { Status } from '../types.js';
import type { Check, CheckResult } from '../types.js';

// Patterns that suggest secrets committed to source
const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"][^'"]{8,}/i,
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
];

export const environmentCheck: Check = {
  name: 'Environment',
  async run(root: string): Promise<CheckResult> {
    const details: string[] = [];
    const hasEnv = fs.existsSync(path.join(root, '.env'));
    const hasExample = fs.existsSync(path.join(root, '.env.example'))
      || fs.existsSync(path.join(root, '.env.sample'));

    // Quick scan for secrets in tracked source files (shallow, not exhaustive)
    const dangerFiles: string[] = [];
    const checkExtensions = ['.ts', '.js', '.py', '.rb', '.go', '.rs', '.json', '.yaml', '.yml', '.toml'];
    const entries = safeReaddir(root);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === '.git') continue;
      const ext = path.extname(entry).toLowerCase();
      if (!checkExtensions.includes(ext)) continue;
      const filePath = path.join(root, entry);
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size > 100_000) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(content)) {
            dangerFiles.push(entry);
            break;
          }
        }
      } catch {
        // skip unreadable files
      }
    }

    if (dangerFiles.length > 0) {
      for (const f of dangerFiles) details.push(`Possible secret in: ${f}`);
      return {
        name: this.name,
        status: Status.Fail,
        summary: 'Secrets detected',
        details,
      };
    }

    if (hasExample && !hasEnv) {
      details.push('.env.example exists but .env is missing');
      return {
        name: this.name,
        status: Status.Warn,
        summary: 'Missing .env',
        details,
      };
    }

    if (hasEnv) {
      details.push('.env present');
    }
    if (!hasExample && !hasEnv) {
      details.push('No .env files (may not be needed)');
    }

    return {
      name: this.name,
      status: Status.Pass,
      summary: hasEnv ? 'Configured' : 'N/A',
      details,
    };
  },
};

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}
