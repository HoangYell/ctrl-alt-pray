import { getDefaultStorage } from './storage.js';
import type { RecoverySession } from './recovery.js';

export function generateResurrectionPacket(sessionOrId: RecoverySession | string): string {
  let session: RecoverySession | undefined;

  if (typeof sessionOrId === 'string') {
    const storage = getDefaultStorage();
    const all = storage.listSessions();
    session = all.find((s) => s.session_id === sessionOrId);
    if (!session) {
      throw new Error(`SESSION_NOT_FOUND: No recovery session found with ID "${sessionOrId}"`);
    }
  } else {
    session = sessionOrId;
  }

  const exp = session.experiment;
  const score = session.falsification?.score ?? exp?.falsification?.score ?? 85;
  const assessmentStr = (session.assessment || 'in_progress').toUpperCase();

  return `# 🕯️ CTRL ALT PRAY - RESURRECTION PACKET
**Session ID:** \`${session.session_id}\` (Project: \`${session.project_key}\`, Revision: \`${session.revision}\`)  
**Generated:** \`${new Date(session.updated_at || Date.now()).toISOString()}\`  
**Assessment:** \`${assessmentStr}\` | **Pathology:** \`${session.pathology || 'unspecified'}\`  
**Decision:** \`${session.decision || 'continue'}\` | **Next Action:** \`${session.next_action || 'experiment'}\`

> *"Resume without the failed narrative. Less blind faith. Better experiments."*

---

### 1. The Goal & Non-Negotiable Invariants
- **Goal:** ${session.handoff.split('|')[1]?.trim() || 'Break execution loop'}
- **Immutable Constraints:**
${session.constraints.length > 0 ? session.constraints.map((c) => `  - \`${c}\``).join('\n') : '  - None specified (standard workspace bounds apply)'}

### 2. Verified Ground Truth (Hard Observations Only)
These facts have been empirically verified by command exit codes, git inspection, or passing assertions:
${session.known_facts.length > 0 ? session.known_facts.map((f) => `  ✓ ${f}`).join('\n') : '  - No verified observations recorded yet.'}

### 3. Ruled-Out Hypotheses (DO NOT RECYCLE)
The prior agent already attempted these approaches and failed to make progress. A fresh agent MUST NOT repeat them without new discriminating evidence:
${session.rejected_approaches.length > 0 ? session.rejected_approaches.map((r) => `  ✗ ${r}`).join('\n') : '  - No approaches rejected yet.'}

### 4. Active Falsification Probe
- **Strategy:** \`${exp?.strategy || 'boundary-check'}\`
- **Rite:** ${session.rite || '🕯️ [THE RITE OF GROUND TRUTH]'}
- **Falsification Score:** \`${score}/100\` [${score >= 60 ? 'PASSED RUBRIC' : 'BELOW THRESHOLD'}]
- **Question:** ${exp?.question || 'N/A'}
- **Probe:** \`${exp?.probe || 'N/A'}\`
- **Expected Outcome:** ${exp?.expected_outcome || 'N/A'}
- **Rollback Safety:** ${exp?.risk || 'Low: read-only inspection; restore baseline afterwards.'}

${session.heresy_challenge ? `### 5. Heresy Challenge (The Unexamined Dogma)
- **Challenged Dogma:** ${session.heresy_challenge.dogma}
- **Counter-Premise:** ${session.heresy_challenge.counter_premise}
- **Iconoclastic Probe:** \`${session.heresy_challenge.probe}\`
` : ''}
---
**Handoff Protocol for Fresh Agent:**
1. Do NOT re-read full prior transcripts or apologize for previous failures.
2. Accept the verified observations in Section 2 as ground truth.
3. Reject all approaches in Section 3.
4. Execute the single bounded probe in Section 4 immediately.
`;
}

export function runResurrect(sessionId?: string): void {
  const storage = getDefaultStorage();

  if (!sessionId) {
    const sessions = storage.listSessions();
    if (sessions.length === 0) {
      console.log('\n  No active recovery sessions found to resurrect.\n');
      return;
    }
    // Default to latest session
    sessionId = sessions[0].session_id;
  }

  const allSessions = storage.listSessions();
  const session = allSessions.find((s) => s.session_id === sessionId);

  if (!session) {
    console.error(`\n  [NOT FOUND]: No recovery session found with ID "${sessionId}".\n`);
    return;
  }

  const packet = generateResurrectionPacket(session);
  console.log(packet);
}
