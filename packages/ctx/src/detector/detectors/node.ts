import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DetectedStack } from '../../types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: { node?: string };
}

function hasDep(pkg: PackageJson, name: string): boolean {
  return (
    name in (pkg.dependencies ?? {}) ||
    name in (pkg.devDependencies ?? {}) ||
    name in (pkg.peerDependencies ?? {})
  );
}

function detectFramework(pkg: PackageJson): string | undefined {
  if (hasDep(pkg, 'next')) return 'Next.js';
  if (hasDep(pkg, 'react')) return 'React';
  if (hasDep(pkg, 'nuxt')) return 'Nuxt';
  if (hasDep(pkg, 'vue')) return 'Vue';
  if (hasDep(pkg, 'svelte')) return 'Svelte';
  if (hasDep(pkg, 'astro')) return 'Astro';
  if (hasDep(pkg, 'hono')) return 'Hono';
  if (hasDep(pkg, 'fastify')) return 'Fastify';
  if (hasDep(pkg, 'express')) return 'Express';
  if (hasDep(pkg, 'koa')) return 'Koa';
  if (hasDep(pkg, 'nestjs') || hasDep(pkg, '@nestjs/core')) return 'NestJS';
  return undefined;
}

function detectRuntime(projectPath: string, pkg: PackageJson): string | undefined {
  for (const versionFile of ['.nvmrc', '.node-version']) {
    const filePath = path.join(projectPath, versionFile);
    if (fs.existsSync(filePath)) {
      const version = fs.readFileSync(filePath, 'utf8').trim().replace(/^v/, '');
      if (version) return `Node.js ${version}`;
    }
  }
  const enginesNode = pkg.engines?.node;
  if (enginesNode) {
    const match = enginesNode.match(/(\d+)/);
    if (match?.[1]) return `Node.js ${match[1]}`;
  }
  return 'Node.js';
}

function detectPackageManager(projectPath: string): string {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function detectTools(projectPath: string, pkg: PackageJson): string[] {
  const tools: string[] = [];
  const hasDevDep = (name: string) => name in (pkg.devDependencies ?? {});

  if (
    hasDevDep('eslint') ||
    fs.existsSync(path.join(projectPath, '.eslintrc')) ||
    fs.existsSync(path.join(projectPath, '.eslintrc.js')) ||
    fs.existsSync(path.join(projectPath, '.eslintrc.json')) ||
    fs.existsSync(path.join(projectPath, 'eslint.config.js')) ||
    fs.existsSync(path.join(projectPath, 'eslint.config.ts'))
  ) {
    tools.push('ESLint');
  }

  if (
    hasDevDep('prettier') ||
    fs.existsSync(path.join(projectPath, '.prettierrc')) ||
    fs.existsSync(path.join(projectPath, '.prettierrc.json')) ||
    fs.existsSync(path.join(projectPath, 'prettier.config.js'))
  ) {
    tools.push('Prettier');
  }

  if (hasDevDep('vitest')) tools.push('Vitest');
  else if (hasDevDep('jest')) tools.push('Jest');

  return tools;
}

export function detectNode(projectPath: string): Partial<DetectedStack> | null {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJson;
  } catch {
    return null;
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasTypeScript = 'typescript' in allDeps || '@types/node' in allDeps;

  const runtime = detectRuntime(projectPath, pkg);
  const framework = detectFramework(pkg);
  return {
    language: hasTypeScript ? 'TypeScript' : 'JavaScript',
    ...(runtime !== undefined && { runtime }),
    ...(framework !== undefined && { framework }),
    packageManager: detectPackageManager(projectPath),
    tools: detectTools(projectPath, pkg),
  };
}
