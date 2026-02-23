export interface DetectedStack {
  language: string;
  runtime?: string;
  framework?: string;
  tools: string[];
  packageManager?: string;
}

export interface GitStatus {
  branch: string;
  clean: boolean;
  uncommittedCount: number;
  remote?: string;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  modifiedAt: Date;
  content?: string;
}

export interface DirectoryStructure {
  name: string;
  children: (DirectoryStructure | string)[];
  fileCount: number;
}

export interface ProjectContext {
  name: string;
  path: string;
  stack: DetectedStack;
  git?: GitStatus;
  structure: DirectoryStructure;
  recentFiles: FileInfo[];
  includedFiles: FileInfo[];
}

export interface Preferences {
  global: Record<string, string>;
  project: Record<string, string>;
}

export interface ContextOutput {
  project: ProjectContext;
  preferences: Preferences;
  prompt?: string;
}

export interface Profile {
  name: string;
  projectPath: string;
  files: string[];
  notes?: string;
  createdAt: Date;
}

export interface ConfigFile {
  version: number;
  preferences: Record<string, string>;
  defaults: {
    compact: boolean;
    recentFiles: number;
    maxFileSize: number;
  };
}

export interface ProjectConfigFile {
  projectPath: string;
  preferences: Record<string, string>;
  updatedAt: string;
}
