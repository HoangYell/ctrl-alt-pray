import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { redactSecrets } from '../recovery.js';
import type { GitHarvestResult } from './types.js';

export function harvestGitState(workspaceDir: string = process.cwd()): GitHarvestResult {
  const gitDir = path.join(workspaceDir, '.git');
  const isGitRepo = fs.existsSync(gitDir);

  if (!isGitRepo) {
    return {
      isGitRepo: false,
      dirtyFiles: [],
      isLocked: false,
    };
  }

  // Check .git/index.lock
  const lockFile = path.join(gitDir, 'index.lock');
  const isLocked = fs.existsSync(lockFile);

  let dirtyFiles: string[] = [];
  let recentDiffSnippet: string | undefined;

  try {
    const statusOutput = execSync('git status --porcelain', {
      cwd: workspaceDir,
      timeout: 2000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    dirtyFiles = statusOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.slice(3).trim());
  } catch {
    // Graceful fallback if git command fails or times out
  }

  try {
    const diffOutput = execSync('git diff -U1 --stat', {
      cwd: workspaceDir,
      timeout: 2000,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    if (diffOutput.trim()) {
      recentDiffSnippet = redactSecrets(diffOutput.trim().slice(0, 1000));
    }
  } catch {
    // Graceful fallback
  }

  return {
    isGitRepo: true,
    dirtyFiles,
    isLocked,
    recentDiffSnippet,
  };
}
