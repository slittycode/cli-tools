import type { DetectedStack } from '../types.js';
import { detectGo } from './detectors/go.js';
import { detectNode } from './detectors/node.js';
import { detectPython } from './detectors/python.js';
import { detectRust } from './detectors/rust.js';

export function detect(projectPath: string): DetectedStack {
  const results = [
    detectNode(projectPath),
    detectPython(projectPath),
    detectRust(projectPath),
    detectGo(projectPath),
  ].filter((r): r is Partial<DetectedStack> => r !== null);

  if (results.length === 0) {
    return { language: 'Unknown', tools: [] };
  }

  // Merge: first match wins for scalar fields, tools are unioned
  const merged: DetectedStack = { language: 'Unknown', tools: [] };
  for (const result of results) {
    if (result.language && merged.language === 'Unknown') merged.language = result.language;
    if (result.runtime && !merged.runtime) merged.runtime = result.runtime;
    if (result.framework && !merged.framework) merged.framework = result.framework;
    if (result.packageManager && !merged.packageManager) merged.packageManager = result.packageManager;
    for (const tool of result.tools ?? []) {
      if (!merged.tools.includes(tool)) merged.tools.push(tool);
    }
  }
  return merged;
}
