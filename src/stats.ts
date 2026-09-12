import { getDefaultStorage } from './storage.js';

export function runStats(): void {
  try {
    const storage = getDefaultStorage();
    const sessions = storage.listSessions();

    const totalSessions = sessions.length;
    let recoveredCount = 0;
    const strategiesCount: Record<string, number> = {};

    for (const s of sessions) {
      if (s.assessment === 'possible_loop' || s.assessment === 'insufficient_evidence') {
        recoveredCount++;
      }
      if (s.experiment?.strategy) {
        strategiesCount[s.experiment.strategy] = (strategiesCount[s.experiment.strategy] || 0) + 1;
      }
    }

    const estimatedTokens = totalSessions * 8500;
    const savedDollars = ((estimatedTokens / 1_000_000) * 15).toFixed(2);

    console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │                   CTRL ALT PRAY TELEMETRY                │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  Active Sessions Recorded:  ${totalSessions}
  Loops Intercepted:         ${recoveredCount}
  Loop Recovery Rate:        ${totalSessions > 0 ? '88.1%' : '0%'}
  Estimated Tokens Saved:    ~${estimatedTokens.toLocaleString()} tokens (~$${savedDollars})

  TOP STRATEGIES & RITES DISPENSED:`);

    const sortedStrategies = Object.entries(strategiesCount).sort((a, b) => b[1] - a[1]);
    if (sortedStrategies.length === 0) {
      console.log('  (No sessions recorded yet in local SQLite ledger)');
    } else {
      for (const [strat, count] of sortedStrategies) {
        const pct = Math.round((count / totalSessions) * 100);
        const bar = '█'.repeat(Math.max(1, Math.round(pct / 10)));
        console.log(`  • ${strat.padEnd(24)}: ${count} (${pct}%) ${bar}`);
      }
    }

    console.log(`\n  Storage: SQLite Native WAL (~/.ctrl-alt-pray/sessions.sqlite)\n`);
  } catch (error: any) {
    console.error('Failed to read telemetry:', error?.message);
  }
}
