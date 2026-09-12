import { harvestGitState } from './git.js';
import { harvestSocketState } from './socket.js';
import { TestArchaeologyAdapter } from './adapters/archaeology.js';
import {
  ClaudeCodeAdapter,
  CursorAdapter,
  AiderAdapter,
  AntigravityAdapter,
} from './adapters/clients.js';
import type { TranscriptAdapter } from './adapters/types.js';
import type { HarvestedEvidence } from './types.js';
import type { ExperimentStrategy } from '../recovery.js';

export * from './types.js';
export * from './git.js';
export * from './socket.js';
export * from './adapters/types.js';
export * from './adapters/archaeology.js';
export * from './adapters/clients.js';

const defaultAdapters: TranscriptAdapter[] = [
  new TestArchaeologyAdapter(),
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new AiderAdapter(),
  new AntigravityAdapter(),
];

/**
 * Harvests ground-truth evidence directly from the local workspace and host environment
 * without requiring the agent to handcraft extensive JSON logs.
 */
export async function harvestEvidence(
  workspaceDir: string = process.cwd(),
  customAdapters: TranscriptAdapter[] = defaultAdapters,
): Promise<HarvestedEvidence> {
  const git = harvestGitState(workspaceDir);
  const sockets = await harvestSocketState();

  const observations: string[] = [];
  let suggestedStrategy: ExperimentStrategy | undefined;

  // 1. Evaluate Git Status
  if (git.isLocked) {
    observations.push('Git repository is locked (.git/index.lock present; prior process was interrupted or is hanging)');
    suggestedStrategy = 'ghost-terminal-breaker';
  }

  if (git.dirtyFiles.length > 0) {
    observations.push(`Git status reports ${git.dirtyFiles.length} uncommitted file(s): ${git.dirtyFiles.slice(0, 5).join(', ')}${git.dirtyFiles.length > 5 ? '...' : ''}`);
    if (git.dirtyFiles.length >= 4 && !suggestedStrategy) {
      suggestedStrategy = 'clean-slate-rollback';
    }
  }

  if (git.recentDiffSnippet) {
    observations.push(`Recent uncommitted diff summary: ${git.recentDiffSnippet}`);
  }

  // 2. Evaluate Sockets
  if (sockets.occupiedPorts.length > 0) {
    observations.push(`Active network service(s) listening on port(s): ${sockets.occupiedPorts.join(', ')}`);
    if (!suggestedStrategy) {
      suggestedStrategy = 'wrong-altar';
    }
  }

  // 3. Pluggable Adapters (Archaeology, Claude, Cursor, Aider, Antigravity)
  try {
    const adapterPromises = customAdapters
      .filter((adapter) => adapter.detect(workspaceDir))
      .map(async (adapter) => {
        try {
          return await adapter.harvest(workspaceDir);
        } catch {
          return [];
        }
      });

    const results = await Promise.allSettled(adapterPromises);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        observations.push(...r.value);
      }
    }
  } catch {
    // Graceful degradation
  }

  // 4. Synthesize Default Problem Description
  let synthesizedProblem = 'Execution loop detected in active workspace.';
  if (suggestedStrategy === 'clean-slate-rollback') {
    synthesizedProblem = `Codebase sepsis: ${git.dirtyFiles.length} dirty files accumulating uncommitted changes without passing verification.`;
  } else if (suggestedStrategy === 'ghost-terminal-breaker' && git.isLocked) {
    synthesizedProblem = 'Git index deadlock: prior command was terminated or is hanging while holding .git/index.lock.';
  } else if (suggestedStrategy === 'wrong-altar' && sockets.occupiedPorts.length > 0) {
    synthesizedProblem = `Potential port conflict: ports [${sockets.occupiedPorts.join(', ')}] are already occupied by running services.`;
  }

  return {
    git,
    sockets,
    suggestedStrategy,
    synthesizedProblem,
    observations,
  };
}
