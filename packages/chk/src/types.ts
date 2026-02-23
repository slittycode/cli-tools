export enum Status {
  Pass = 'pass',
  Warn = 'warn',
  Fail = 'fail',
  Skip = 'skip',
}

export interface CheckResult {
  /** Display name for this check */
  name: string;
  /** Traffic-light status */
  status: Status;
  /** One-line summary shown in the card */
  summary: string;
  /** Detail lines shown in verbose mode */
  details: string[];
}

export interface Check {
  /** Display name for this check */
  name: string;
  /** Run the check against the given project root */
  run(root: string): Promise<CheckResult>;
}

export interface CliOptions {
  verbose: boolean;
  json: boolean;
  skip: string[];
}
