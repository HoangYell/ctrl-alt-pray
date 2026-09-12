import { getDefaultStorage } from './storage.js';

export function runPurge(projectKey: string = 'default', sessionId?: string): void {
  const storage = getDefaultStorage();

  const purgeResult = storage.purge(projectKey, sessionId);
  const pruneResult = storage.pruneOldSessions(7);

  console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │         CTRL ALT PRAY - ADMINISTRATIVE LEDGER PURGE       │
  │     "Wipe the altar stone. Return to clean ground."      │
  └──────────────────────────────────────────────────────────┘
`);

  if (sessionId) {
    console.log(`  • Purged Session:        "${sessionId}" (project: "${projectKey}")`);
  } else {
    console.log(`  • Purged Project:        "${projectKey}"`);
  }
  console.log(`  • Sessions Deleted:      ${purgeResult.deletedSessions}`);
  console.log(`  • Stale Sessions Pruned: ${pruneResult.prunedSessions} (>7 days retention)`);
  console.log(`  • Idempotency Cleared:   ${purgeResult.deletedIdempotency + pruneResult.prunedIdempotency}`);
  console.log(`\n  Target session state and evidence successfully purged from SQLite.\n`);
}
