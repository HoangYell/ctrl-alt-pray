import type { ExperimentStrategy } from '../recovery.js';

export interface GitHarvestResult {
  isGitRepo: boolean;
  dirtyFiles: string[];
  isLocked: boolean;
  recentDiffSnippet?: string;
}

export interface SocketHarvestResult {
  occupiedPorts: number[];
  checkedPorts: number[];
}

export interface HarvestedEvidence {
  git: GitHarvestResult;
  sockets: SocketHarvestResult;
  suggestedStrategy?: ExperimentStrategy;
  synthesizedProblem: string;
  observations: string[];
}
