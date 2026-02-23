// Public programmatic API for ctx

// Core pipeline
export { detect } from './detector/Detector.js';
export {
  buildDirectoryStructure,
  getGitStatus,
  getRecentFiles,
  isBinaryFile,
  readFiles,
} from './collector/Collector.js';
export {
  format,
  formatJson,
  formatRelativeTime,
  renderDirectoryTree,
} from './formatter/Formatter.js';

// Config & preferences
export {
  ensureConfigDir,
  getConfigDir,
  loadGlobalConfig,
  loadPreferences,
  loadProjectConfig,
  projectHash,
  saveGlobalConfig,
  saveProjectConfig,
} from './config/Config.js';

// Profiles
export {
  deleteProfile,
  listProfiles,
  loadProfile,
  saveProfile,
  validateProfileName,
} from './profiles/Profiles.js';

// Types
export type {
  ConfigFile,
  ContextOutput,
  DetectedStack,
  DirectoryStructure,
  FileInfo,
  GitStatus,
  Preferences,
  Profile,
  ProjectConfigFile,
  ProjectContext,
} from './types.js';
