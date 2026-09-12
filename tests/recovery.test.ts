import { describe, expect, it } from 'vitest';

import { createRecoverySession, reportOutcome } from '../src/recovery.js';

describe('Ctrl Alt Pray recovery flow', () => {
  it('creates a session and a bounded next experiment', () => {
    const result = createRecoverySession({
      project_key: 'demo-project',
      request_id: 'req-1',
      problem: 'The API still returns 401 after two token changes.',
      constraints: ['Do not expose secrets.'],
      observations: ['The failing request returns 401.', 'The known-good request succeeds.'],
      attempts: ['Tried a refreshed token.', 'Tried a new header ordering.'],
      candidate_hypotheses: ['token expired', 'request boundary mismatch'],
      capabilities: ['run-tests'],
      budget: 3,
    });

    expect(result.session_id).toBeTruthy();
    expect(result.next_action).toBe('experiment');
    expect(result.assessment).toBe('possible_loop');
    expect(result.experiment).toBeTruthy();
    expect(result.experiment?.strategy).toBe('boundary-check');
  });

  it('records outcome updates and rejects stale revisions', () => {
    const initial = createRecoverySession({
      project_key: 'demo-project',
      request_id: 'req-2',
      problem: 'The test still fails before database execution.',
      constraints: ['Keep production safe.'],
      observations: ['The failing trace disappears before the DB call.'],
      attempts: ['Added extra logging.'],
      candidate_hypotheses: ['db problem', 'before-db issue'],
      capabilities: ['run-tests'],
      budget: 2,
    });

    const updated = reportOutcome({
      project_key: 'demo-project',
      session_id: initial.session_id,
      expected_revision: initial.revision,
      request_id: 'req-outcome-1',
      experiment_id: initial.experiment_id,
      outcome: 'supports',
      observations: ['The counterexample reproduces before the DB layer.'],
      checks: [{ name: 'pre-db-check', result: 'pass' }],
    });

    expect(updated.decision).toBe('continue');
    expect(updated.revision).toBeGreaterThan(initial.revision);

    expect(() =>
      reportOutcome({
        project_key: 'demo-project',
        session_id: initial.session_id,
        expected_revision: initial.revision,
        request_id: 'req-outcome-2',
        experiment_id: initial.experiment_id,
        outcome: 'contradicts',
        observations: ['stale update'],
        checks: [{ name: 'stale-check', result: 'pass' }],
      }),
    ).toThrow(/STALE_REVISION|expected_revision/i);
  });
});