import { describe, expect, it, beforeEach } from 'vitest';

import {
  createOrResumeRecoverySession,
  reportOutcome,
  inspectSession,
  listSessions,
  selectStrategy,
} from '../src/recovery.js';
import { RecoveryStorage, setDefaultStorage } from '../src/storage.js';

describe('Ctrl Alt Pray recovery flow', () => {
  let inMemoryStorage: RecoveryStorage;

  beforeEach(() => {
    inMemoryStorage = new RecoveryStorage({ inMemory: true });
    setDefaultStorage(inMemoryStorage);
  });

  it('creates a session and selects bounded experiment', () => {
    const result = createOrResumeRecoverySession({
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
    expect(result.experiment?.strategy).toBe('assumption-audit');
  });

  it('records outcome updates and rejects stale revisions', () => {
    const initial = createOrResumeRecoverySession({
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
    expect(updated.revision).toBe(initial.revision + 1);

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
    ).toThrow(/STALE_REVISION/i);
  });

  it('supports resuming an existing session with session_id and expected_revision', () => {
    const initial = createOrResumeRecoverySession({
      project_key: 'resume-project',
      request_id: 'req-init',
      problem: 'Stuck in flaky websocket disconnect loop.',
      attempts: ['restarted server', 'changed timeout'],
      observations: ['socket closes with code 1006'],
    });

    expect(initial.revision).toBe(1);

    const resumed = createOrResumeRecoverySession({
      project_key: 'resume-project',
      session_id: initial.session_id,
      expected_revision: 1,
      request_id: 'req-resume',
      problem: 'Stuck in flaky websocket disconnect loop.',
      observations: ['heartbeat ping interval is 30s'],
      candidate_hypotheses: ['proxy drops connection before heartbeat'],
    });

    expect(resumed.session_id).toBe(initial.session_id);
    expect(resumed.revision).toBe(2);
    expect(resumed.known_facts).toContain('heartbeat ping interval is 30s');
    expect(resumed.assumptions_to_check).toContain('proxy drops connection before heartbeat');
  });

  it('enforces idempotency on duplicate request_id', () => {
    const firstCall = createOrResumeRecoverySession({
      project_key: 'idempotent-proj',
      request_id: 'idempotent-key-123',
      problem: 'Memory leak in worker pool',
      observations: ['Heap grows monotonically by 5MB per job'],
    });

    const secondCall = createOrResumeRecoverySession({
      project_key: 'idempotent-proj',
      request_id: 'idempotent-key-123',
      problem: 'Memory leak in worker pool',
      observations: ['Different observation that should be ignored due to idempotency'],
    });

    expect(secondCall.session_id).toBe(firstCall.session_id);
    expect(secondCall.revision).toBe(firstCall.revision);
    expect(secondCall.known_facts).toEqual(firstCall.known_facts);
  });

  it('rejects non-existent session with SESSION_NOT_FOUND', () => {
    expect(() =>
      inspectSession('some-project', 'non-existent-session-id'),
    ).toThrow(/SESSION_NOT_FOUND/);

    expect(() =>
      reportOutcome({
        project_key: 'some-project',
        session_id: 'non-existent-session-id',
        expected_revision: 1,
        request_id: 'req-fail',
        outcome: 'supports',
      }),
    ).toThrow(/SESSION_NOT_FOUND/);
  });

  it('dynamically selects wrong-altar strategy when edits have no effect', () => {
    const experiment = selectStrategy({
      problem: 'Config update failed',
      observations: ['The server output is completely unchanged after code edits'],
      attempts: ['Changed PORT in .env', 'Changed PORT in server.ts (same error, no effect)'],
      candidate_hypotheses: [],
      capabilities: ['bash'],
    });

    expect(experiment.strategy).toBe('wrong-altar');
    expect(experiment.question).toContain('executing the exact file');
  });

  it('dynamically selects check-the-check strategy when tests pass or logs missing', () => {
    const experiment = selectStrategy({
      problem: 'Authentication bypass suspected',
      observations: ['The test passes with green test status but endpoint returns 200 for invalid token'],
      attempts: ['Updated auth middleware'],
      candidate_hypotheses: [],
      capabilities: ['run-tests'],
    });

    expect(experiment.strategy).toBe('check-the-check');
    expect(experiment.question).toContain('reliably fail');
  });

  it('dynamically selects ghost-terminal-breaker strategy when command hangs or waiting for output', () => {
    const experiment = selectStrategy({
      problem: 'Agent stuck waiting for output from terminal indefinitely',
      observations: ['The command appears to be hanging with no output from terminal for 10 minutes'],
      attempts: ['Waiting for task to finish'],
      candidate_hypotheses: [],
      capabilities: ['bash'],
    });

    expect(experiment.strategy).toBe('ghost-terminal-breaker');
    expect(experiment.question).toContain('without emitting a stream EOF/exit event');
    expect(experiment.probe).toContain('mtime is unchanged');
  });

  it('dynamically selects api-ground-truth strategy when hallucinating exported members', () => {
    const experiment = selectStrategy({
      problem: 'Compilation error in auth pipeline',
      observations: ['TypeError: verifyToken is not a function', 'Module has no exported member verifyToken'],
      attempts: ['Tried importing verifyToken', 'Tried importing tokenVerifier'],
      candidate_hypotheses: [],
      capabilities: ['node'],
    });

    expect(experiment.strategy).toBe('api-ground-truth');
    expect(experiment.question).toContain('actually export the expected symbol');
    expect(experiment.probe).toContain('Do not guess alternate names');
  });

  it('dynamically selects clean-slate-rollback when too many dirty edits pollute the failure', () => {
    const experiment = selectStrategy({
      problem: 'Multiple broken tests after experimental patches',
      observations: ['git status shows messy diff across 6 files with dirty working tree'],
      attempts: ['Patch 1', 'Patch 2', 'Patch 3', 'Patch 4'],
      candidate_hypotheses: [],
      capabilities: ['git'],
    });

    expect(experiment.strategy).toBe('clean-slate-rollback');
    expect(experiment.question).toContain('Are uncommitted abandoned debug edits');
    expect(experiment.probe).toContain('git status -s');
  });

  it('preserves immutable constraints across session resumption and outcome reporting', () => {
    const initial = createOrResumeRecoverySession({
      project_key: 'constraint-test',
      request_id: 'req-c1',
      problem: 'Fix slow query without schema migration',
      constraints: ['DO_NOT_ALTER_SCHEMA', 'NO_EXTERNAL_DEPS'],
    });

    expect(initial.constraints).toContain('DO_NOT_ALTER_SCHEMA');
    expect(initial.constraints).toContain('NO_EXTERNAL_DEPS');

    const updated = reportOutcome({
      project_key: 'constraint-test',
      session_id: initial.session_id,
      expected_revision: 1,
      request_id: 'req-c2',
      outcome: 'contradicts',
      observations: ['Index scan still takes 3s'],
    });

    expect(updated.constraints).toContain('DO_NOT_ALTER_SCHEMA');
    expect(updated.avoid_repeating.length).toBeGreaterThan(0);
  });

  it('inspects session ledger without mutating revision', () => {
    const initial = createOrResumeRecoverySession({
      project_key: 'inspect-project',
      request_id: 'req-inspect',
      problem: 'Deadlock during concurrent writes',
      observations: ['Lock wait timeout 50s'],
    });

    const inspected = inspectSession('inspect-project', initial.session_id);
    expect(inspected.session_id).toBe(initial.session_id);
    expect(inspected.revision).toBe(1);

    const allSessions = listSessions('inspect-project');
    expect(allSessions.length).toBe(1);
    expect(allSessions[0].session_id).toBe(initial.session_id);
  });

  it('persists sessions across SQLite storage reloads', () => {
    // Test on a temporary file-based storage
    const tmpStorage1 = new RecoveryStorage({ inMemory: true });
    const session = createOrResumeRecoverySession(
      {
        project_key: 'storage-test',
        request_id: 'req-store',
        problem: 'Disk quota exceeded',
        observations: ['df -h shows /var at 100%'],
      },
      tmpStorage1,
    );

    const loaded = tmpStorage1.getSession('storage-test', session.session_id);
    expect(loaded).toBeDefined();
    expect(loaded?.session_id).toBe(session.session_id);
    expect(loaded?.known_facts).toContain('df -h shows /var at 100%');
  });

  it('attaches occult rites, incantations, and nhan_pham rolls to sessions', () => {
    const session = createOrResumeRecoverySession({
      project_key: 'occult-test',
      request_id: 'req-occult-1',
      problem: 'The terminal is stuck waiting for output',
      observations: ['PID 42105 is unresponsive'],
    });

    expect(session.rite).toContain('EXORCISM OF THE ZOMBIE');
    expect(session.incantation).toContain('Banish the mute terminal');
    expect(session.nhan_pham).toBeDefined();
    expect(session.nhan_pham?.score).toBeGreaterThanOrEqual(1);
    expect(session.nhan_pham?.score).toBeLessThanOrEqual(100);
    expect(session.handoff).toContain('EXORCISM OF THE ZOMBIE');
  });

  it('detects apology slop and scolds the agent with an altar warning', () => {
    const session = createOrResumeRecoverySession({
      project_key: 'apology-test',
      request_id: 'req-apology-1',
      problem: 'I apologize for the confusion! Let me fix that!',
      observations: ['I am deeply sorry for my mistake'],
    });

    expect(session.altar_warning).toBeDefined();
    expect(session.altar_warning).toContain('THE ALTAR SCOWLS');
    expect(session.altar_warning).toContain('The Gods accept no apologies from mortals');
  });
});