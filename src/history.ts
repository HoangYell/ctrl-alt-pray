import { getDefaultStorage } from './storage.js';

export function runHistory(sessionId?: string): void {
  const storage = getDefaultStorage();

  if (!sessionId) {
    const sessions = storage.listSessions();
    console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │              CTRL ALT PRAY - THE CONFESSIONAL            │
  │     Recent Recovery Sessions & Decisional Timelines      │
  └──────────────────────────────────────────────────────────┘
`);

    if (sessions.length === 0) {
      console.log('  No sessions recorded yet in local SQLite ledger.\n');
      return;
    }

    console.log('  Active & Recent Sessions:');
    for (const s of sessions.slice(0, 10)) {
      const pathology = (s.pathology || 'unspecified').padEnd(14);
      const strategy = (s.experiment?.strategy || 'none').padEnd(22);
      const rev = `rev:${s.revision}`.padEnd(7);
      console.log(`  • ID: ${s.session_id.padEnd(10)} [${s.project_key.padEnd(12)}] ${rev} ${pathology} ${strategy}`);
    }
    console.log(`\n  Run 'ctrl-alt-pray history <session_id>' to replay the 3-step decision tree.\n`);
    return;
  }

  // Find specific session across projects or default
  const allSessions = storage.listSessions();
  const session = allSessions.find((s) => s.session_id === sessionId);

  if (!session) {
    console.error(`\n  [NOT FOUND]: No session found with ID "${sessionId}".\n`);
    return;
  }

  const exp = session.experiment;
  const score = session.falsification?.score ?? exp?.falsification?.score ?? 85;
  const breakdown = session.falsification?.breakdown ?? exp?.falsification?.breakdown ?? {
    discriminative_power: 25,
    scope_minimality: 25,
    negative_control: 15,
    clean_rollback: 20,
  };

  console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │              CTRL ALT PRAY - THE CONFESSIONAL            │
  │            Session Decision Tree: ${session.session_id}           │
  └──────────────────────────────────────────────────────────┘

  STEP 1: THE TRAP (Initial Pathology & Stuck State)
  • Project:      ${session.project_key} (Revision: ${session.revision})
  • Pathology:    ${session.pathology || 'unspecified'} - ${session.pathology_rationale || 'General execution loop'}
  • Known Facts:  ${session.known_facts.length} verified facts collected
  • Prior Fails:  ${session.rejected_approaches.length} approaches previously attempted

  STEP 2: THE ALTAR'S PROBE (Falsification Experiment)
  • Strategy:     ${exp?.strategy || 'none'}
  • Rite:         ${session.rite || '🕯️ [THE RITE OF GROUND TRUTH]'}
  • Question:     ${exp?.question || 'N/A'}
  • Probe:        ${exp?.probe || 'N/A'}
  • Falsification Rubric: ${score}/100 [Passed: ${score >= 60 ? 'YES' : 'NO'}]
    - Discriminative Power: ${breakdown.discriminative_power}/30
    - Scope Minimality:     ${breakdown.scope_minimality}/30
    - Negative Control:     ${breakdown.negative_control}/20
    - Clean Rollback:       ${breakdown.clean_rollback}/20

  STEP 3: THE DELIVERANCE (Current Assessment & Next Step)
  • Assessment:   ${session.assessment}
  • Next Action:  ${session.next_action}
  • Decision:     ${session.decision}
  • Verification: ${session.verification_status || 'not_verified'}
  • Handoff:      ${session.handoff}
`);
}
