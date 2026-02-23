import type { Check } from '../types.js';
import { gitStatusCheck } from './git-status.js';
import { dependenciesCheck } from './dependencies.js';
import { debtMarkersCheck } from './debt-markers.js';
import { readmeCheck } from './readme.js';
import { environmentCheck } from './environment.js';
import { gitignoreCheck } from './gitignore.js';
import { buildFreshnessCheck } from './build-freshness.js';
import { licenseCheck } from './license.js';

/**
 * All checks in display order.
 */
export const allChecks: Check[] = [
  gitStatusCheck,
  dependenciesCheck,
  debtMarkersCheck,
  readmeCheck,
  environmentCheck,
  gitignoreCheck,
  buildFreshnessCheck,
  licenseCheck,
];
