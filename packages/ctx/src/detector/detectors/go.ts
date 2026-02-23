import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DetectedStack } from '../../types.js';

function detectFramework(goModContent: string): string | undefined {
  if (goModContent.includes('github.com/gin-gonic/gin')) return 'Gin';
  if (goModContent.includes('github.com/go-chi/chi')) return 'Chi';
  if (goModContent.includes('github.com/labstack/echo')) return 'Echo';
  if (goModContent.includes('github.com/gofiber/fiber')) return 'Fiber';
  return undefined;
}

function detectRuntime(goModContent: string): string {
  const match = goModContent.match(/^go\s+(\d+\.\d+(?:\.\d+)?)/m);
  return match?.[1] ? `Go ${match[1]}` : 'Go';
}

export function detectGo(projectPath: string): Partial<DetectedStack> | null {
  const goModPath = path.join(projectPath, 'go.mod');
  if (!fs.existsSync(goModPath)) return null;

  const content = fs.readFileSync(goModPath, 'utf8');
  const tools: string[] = [];
  if (fs.existsSync(path.join(projectPath, '.golangci.yml')) ||
      fs.existsSync(path.join(projectPath, '.golangci.yaml'))) {
    tools.push('golangci-lint');
  }

  const framework = detectFramework(content);
  return {
    language: 'Go',
    runtime: detectRuntime(content),
    ...(framework !== undefined && { framework }),
    packageManager: 'go modules',
    tools,
  };
}
