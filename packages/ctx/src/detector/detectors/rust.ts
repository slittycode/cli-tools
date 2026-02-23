import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { DetectedStack } from '../../types.js';

interface CargoToml {
  package?: { name?: string; version?: string };
  dependencies?: Record<string, unknown>;
  'dev-dependencies'?: Record<string, unknown>;
}

function detectFramework(deps: Record<string, unknown>): string | undefined {
  if ('axum' in deps) return 'Axum';
  if ('actix-web' in deps) return 'Actix Web';
  if ('warp' in deps) return 'Warp';
  if ('rocket' in deps) return 'Rocket';
  return undefined;
}

export function detectRust(projectPath: string): Partial<DetectedStack> | null {
  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return null;

  let cargo: CargoToml = {};
  try {
    cargo = parseToml(fs.readFileSync(cargoPath, 'utf8')) as CargoToml;
  } catch {
    // still a Rust project even with malformed Cargo.toml
  }

  const deps = cargo.dependencies ?? {};
  const tools: string[] = [];
  if (fs.existsSync(path.join(projectPath, 'clippy.toml')) ||
      fs.existsSync(path.join(projectPath, '.clippy.toml'))) {
    tools.push('Clippy');
  }
  if (fs.existsSync(path.join(projectPath, 'rustfmt.toml')) ||
      fs.existsSync(path.join(projectPath, '.rustfmt.toml'))) {
    tools.push('rustfmt');
  }

  const framework = detectFramework(deps);
  return {
    language: 'Rust',
    packageManager: 'cargo',
    ...(framework !== undefined && { framework }),
    tools,
  };
}
