import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { DetectedStack } from '../../types.js';

interface PyprojectToml {
  project?: {
    dependencies?: string[];
    'requires-python'?: string;
  };
  tool?: {
    poetry?: {
      dependencies?: Record<string, unknown>;
      'dev-dependencies'?: Record<string, unknown>;
    };
    mypy?: Record<string, unknown>;
    ruff?: Record<string, unknown>;
    black?: Record<string, unknown>;
    pytest?: Record<string, unknown>;
  };
}

function extractDeps(pyproject: PyprojectToml): string[] {
  const deps: string[] = [];
  const rawDeps = pyproject.project?.dependencies ?? [];
  // PEP 517: array of strings like ["fastapi>=0.1"]
  // Also guard against smol-toml returning a table if fixture is malformed
  const projectDeps = Array.isArray(rawDeps) ? (rawDeps as unknown[]) : [];
  for (const dep of projectDeps) {
    if (typeof dep !== 'string') continue;
    const match = dep.match(/^([A-Za-z0-9_-]+)/);
    if (match?.[1]) deps.push(match[1].toLowerCase());
  }
  const poetryDeps = {
    ...pyproject.tool?.poetry?.dependencies,
    ...pyproject.tool?.poetry?.['dev-dependencies'],
  };
  for (const dep of Object.keys(poetryDeps)) {
    deps.push(dep.toLowerCase());
  }
  return deps;
}

function detectFramework(deps: string[]): string | undefined {
  if (deps.includes('fastapi')) return 'FastAPI';
  if (deps.includes('django')) return 'Django';
  if (deps.includes('flask')) return 'Flask';
  if (deps.includes('typer')) return 'Typer';
  if (deps.includes('click')) return 'Click';
  return undefined;
}

function detectRuntime(projectPath: string, pyproject: PyprojectToml): string {
  const versionFile = path.join(projectPath, '.python-version');
  if (fs.existsSync(versionFile)) {
    const version = fs.readFileSync(versionFile, 'utf8').trim();
    if (version) return `Python ${version}`;
  }
  const requiresPython = pyproject.project?.['requires-python'];
  if (requiresPython) {
    const match = requiresPython.match(/(\d+\.\d+)/);
    if (match?.[1]) return `Python ${match[1]}`;
  }
  return 'Python';
}

function detectTools(projectPath: string, pyproject: PyprojectToml): string[] {
  const tools: string[] = [];
  if (
    pyproject.tool?.mypy !== undefined ||
    fs.existsSync(path.join(projectPath, 'mypy.ini')) ||
    fs.existsSync(path.join(projectPath, '.mypy.ini'))
  ) {
    tools.push('mypy');
  }
  if (
    pyproject.tool?.ruff !== undefined ||
    fs.existsSync(path.join(projectPath, 'ruff.toml'))
  ) {
    tools.push('ruff');
  }
  if (
    pyproject.tool?.black !== undefined ||
    fs.existsSync(path.join(projectPath, '.black'))
  ) {
    tools.push('black');
  }
  if (
    pyproject.tool?.pytest !== undefined ||
    fs.existsSync(path.join(projectPath, 'pytest.ini')) ||
    fs.existsSync(path.join(projectPath, 'setup.cfg'))
  ) {
    tools.push('pytest');
  }
  return tools;
}

export function detectPython(projectPath: string): Partial<DetectedStack> | null {
  const pyprojectPath = path.join(projectPath, 'pyproject.toml');
  const requirementsPath = path.join(projectPath, 'requirements.txt');

  if (!fs.existsSync(pyprojectPath) && !fs.existsSync(requirementsPath)) return null;

  let pyproject: PyprojectToml = {};
  if (fs.existsSync(pyprojectPath)) {
    try {
      pyproject = parseToml(fs.readFileSync(pyprojectPath, 'utf8')) as PyprojectToml;
    } catch {
      // malformed TOML — still a Python project
    }
  }

  const deps = extractDeps(pyproject);

  const framework = detectFramework(deps);
  const packageManager = fs.existsSync(path.join(projectPath, 'uv.lock')) ? 'uv' : undefined;
  return {
    language: 'Python',
    runtime: detectRuntime(projectPath, pyproject),
    ...(framework !== undefined && { framework }),
    ...(packageManager !== undefined && { packageManager }),
    tools: detectTools(projectPath, pyproject),
  };
}
