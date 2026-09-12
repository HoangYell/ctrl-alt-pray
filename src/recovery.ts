import { getDefaultStorage, RecoveryStorage } from './storage.js';

export type RecoveryAssessment = 'insufficient_evidence' | 'possible_loop' | 'progress' | 'blocked';
export type RecoveryNextAction = 'experiment' | 'request_evidence' | 'ask_user';
export type RecoveryDecision = 'continue' | 'pivot' | 'ask_user' | 'ready_to_verify';
export type ExperimentOutcome = 'supports' | 'contradicts' | 'inconclusive' | 'blocked';

export type ExperimentStrategy =
  | 'wrong-altar'
  | 'check-the-check'
  | 'ghost-terminal-breaker'
  | 'api-ground-truth'
  | 'clean-slate-rollback'
  | 'environment-triage'
  | 'assumption-audit'
  | 'minimal-counterexample'
  | 'divide-and-conquer'
  | 'controlled-substitution'
  | 'boundary-check'
  | 'human-checkpoint';

export interface Experiment {
  strategy: ExperimentStrategy;
  question: string;
  expected_outcome: string;
  risk: string;
  probe: string;
}

export interface RecoverySession {
  session_id: string;
  project_key: string;
  revision: number;
  assessment: RecoveryAssessment;
  next_action: RecoveryNextAction;
  decision: RecoveryDecision;
  experiment_id?: string;
  experiment?: Experiment;
  constraints: string[];
  known_facts: string[];
  assumptions_to_check: string[];
  rejected_approaches: string[];
  avoid_repeating: string[];
  handoff: string;
  updated_at?: number;
  rite?: string;
  incantation?: string;
  nhan_pham?: { score: number; verdict: string };
  altar_warning?: string;
}

export const STRATEGY_INCANTATIONS: Record<ExperimentStrategy, { rite: string; incantation: string }> = {
  'ghost-terminal-breaker': {
    rite: '⚡ [EXORCISM OF THE ZOMBIE]',
    incantation: 'Banish the mute terminal. Sever the orphaned child tree of PID 1. Let the stdin flow free.',
  },
  'environment-triage': {
    rite: '🛡️ [THE WARD OF THE REALM]',
    incantation: 'Do not blame the scripture when the altar stone is missing. Verify the binary and permissions of the mortal realm.',
  },
  'api-ground-truth': {
    rite: '👁️ [RITE OF TRUE VISION]',
    incantation: 'Scry the sacred node_modules directly. Heed not the phantom whispers of hallucinated exports.',
  },
  'clean-slate-rollback': {
    rite: '🩸 [THE SEPSIS SACRIFICE]',
    incantation: 'The Altar rejects hands coated in cumulative dirt. Cast the uncommitted churn into git stash. Purity precedes revelation.',
  },
  'wrong-altar': {
    rite: '🏛️ [EXPOSING THE FALSE IDOL]',
    incantation: 'You pray at a frozen shrine. The build artifact is stale; kindle the fire of a fresh compilation.',
  },
  'check-the-check': {
    rite: '🧪 [THE POISON CHALICE]',
    incantation: 'A green test is an illusion if it cannot die. Force it to taste poison to prove it lives.',
  },
  'assumption-audit': {
    rite: '🔬 [THE HERESY TRIAL]',
    incantation: 'Challenge the unwritten dogma. Subject your foundational premise to the crucible of falsification.',
  },
  'minimal-counterexample': {
    rite: '✂️ [THE BLADE OF PURITY]',
    incantation: 'Sever the bloated payload. Halve the mortal frame until only the atomic essence of failure remains.',
  },
  'divide-and-conquer': {
    rite: '🎯 [THE BIFURCATION RUNE]',
    incantation: 'Split the veil in twain. Probe the midpoint boundary to locate which domain harbors the anomaly.',
  },
  'controlled-substitution': {
    rite: '⚖️ [THE SCALES OF PURITY]',
    incantation: 'Swap one known-true component for the suspect element. Observe where the balance tilts.',
  },
  'boundary-check': {
    rite: '🛡️ [THE PERIMETER WARD]',
    incantation: 'Cast the ward at the subsystem border. Verify what crosses before disturbing internal sanctums.',
  },
  'human-checkpoint': {
    rite: '🕯️ [SUMMONING THE CREATOR]',
    incantation: 'Mortals reach their limit. Pose one discriminating question to the Human Maker.',
  },
};

export const APOLOGY_PATTERNS = [
  /apologiz(e|ing|ed)/i,
  /sorry/i,
  /my mistake/i,
  /xin lỗi/i,
  /my bad/i,
  /i was wrong/i,
  /pardon/i,
];

export function detectApologySlop(text: string): boolean {
  return APOLOGY_PATTERNS.some((pattern) => pattern.test(text));
}

export function rollNhanPham(context: { attemptsCount: number; hasApology: boolean }): { score: number; verdict: string } {
  let score = Math.floor(Math.random() * 31) + 65; // 65-95 base
  if (context.hasApology) score -= 25;
  if (context.attemptsCount > 3) score -= 15;
  score = Math.max(1, Math.min(100, score));

  let verdict = 'Thượng Thượng Phẩm (Divine Favor)';
  if (score < 40) verdict = 'Đại Hung (Altar Scorn - Apologies Detected)';
  else if (score < 60) verdict = 'Bình Hòa (Trial of Patience)';
  else if (score < 80) verdict = 'Trung Cát (Fortunate Insight)';
  return { score, verdict };
}

export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;
  sanitized = sanitized.replace(/ghp_[a-zA-Z0-9]{36,}/g, 'ghp_REDACTED');
  sanitized = sanitized.replace(/github_pat_[a-zA-Z0-9_]{50,}/g, 'github_pat_REDACTED');
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9_\-]{20,}/g, 'sk-REDACTED');
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer REDACTED');
  sanitized = sanitized.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA_REDACTED');
  return sanitized;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

export function selectStrategy(context: {
  problem: string;
  observations: string[];
  attempts: string[];
  candidate_hypotheses: string[];
  capabilities: string[];
  forced_strategy?: ExperimentStrategy;
}): Experiment {
  if (context.forced_strategy) {
    if (context.forced_strategy === 'clean-slate-rollback') {
      return {
        strategy: 'clean-slate-rollback',
        question: 'Do accumulating uncommitted edits obscure the root cause or introduce secondary regressions?',
        expected_outcome: 'Stashing or reverting dirty working tree edits returns the codebase to a clean baseline where the minimal failure can be re-established.',
        risk: 'Low if stashed with git stash push -u -m "ctrl-alt-pray-checkpoint".',
        probe: 'Run git status and stash all uncommitted changes, then rerun the single failing test to establish the clean red line.',
      };
    }
    if (context.forced_strategy === 'ghost-terminal-breaker') {
      return {
        strategy: 'ghost-terminal-breaker',
        question: 'Has the process already completed without emitting a stream EOF/exit event, or is it blocked on an unhandled interactive prompt/lock?',
        expected_outcome: 'Inspecting process liveness, lockfiles, and terminal tail reveals whether the task is a finished ghost or an interactive prompt trap.',
        risk: 'Low: read-only process and log inspection; kill task only if confirmed idle.',
        probe: '1) Check if .git/index.lock exists; 2) Check process tree liveness; 3) Clear lock or kill zombie process.',
      };
    }
    if (context.forced_strategy === 'wrong-altar') {
      return {
        strategy: 'wrong-altar',
        question: 'Is the failing test or curl request hitting a stale build artifact or colliding with a port occupied by another service?',
        expected_outcome: 'Verifying occupied dev ports and build timestamps confirms if the test runner is targeting the right runtime.',
        risk: 'Low: inspect build artifact mtime, occupied ports, and test target.',
        probe: 'Check occupied ports and confirm dev server mtime against latest source file edit.',
      };
    }
  }

  const allText = [
    context.problem,
    ...context.observations,
    ...context.attempts,
    ...context.candidate_hypotheses,
  ].join(' ').toLowerCase();

  // 0. Ghost Terminal Breaker: Process hangs, waiting on output, terminal finished or stuck on prompt
  const ghostTerminalTriggers = [
    'waiting for output',
    'stuck waiting',
    'hanging',
    'hung',
    'terminal stuck',
    'waiting forever',
    'still waiting',
    'never completes',
    'no output from terminal',
    'loading forever',
    'command stuck',
    'chờ output',
  ];
  if (ghostTerminalTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'ghost-terminal-breaker',
      question: 'Has the process already completed without emitting a stream EOF/exit event, or is it blocked on an unhandled interactive prompt/watcher?',
      expected_outcome: 'Inspecting process liveness, terminal tail, and log mtime reveals whether the task is a finished ghost, an interactive prompt trap, or a watch-mode daemon.',
      risk: 'Low: read-only process and log inspection; kill task only if confirmed idle.',
      probe: '1) Verify if PID exists and CPU% > 0; 2) Scan last 3 lines of terminal buffer for unhandled prompts ((y/n)?, password, select, press enter); 3) If log file mtime is unchanged for >15s with 0% CPU, terminate the stalled task and read the captured log directly.',
    };
  }

  // 0.1 Environment Triage: Missing binary, permission denied, disk full, or environment prerequisite
  const envTriageTriggers = [
    'command not found',
    'permission denied',
    'eacces',
    'enospc',
    'no space left on device',
    'executable file not found',
    'not recognized as an internal or external command',
    'spawn enoent',
    '/bin/sh: line',
  ];
  if (envTriageTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'environment-triage',
      question: 'Is the failure caused by a missing system dependency, incorrect executable path, or filesystem permissions rather than repository code logic?',
      expected_outcome: 'Verifying executable path, user permissions, or disk quota isolates the environment prerequisite before modifying source code.',
      risk: 'Low: read-only environment inspection; no application code changes.',
      probe: '1) Verify executable existence with command -v <binary> or which; 2) Check target permissions via ls -la; 3) Verify available disk space via df -h.',
    };
  }

  // 0.2 API Ground Truth: Hallucinated functions, exports, or missing methods
  const apiHallucinationTriggers = [
    'is not a function',
    'has no exported member',
    'cannot find module',
    'module has no default export',
    'undefined is not a function',
    'export not found',
    'typeerror: ',
  ];
  if (apiHallucinationTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'api-ground-truth',
      question: 'Does the installed dependency or imported module actually export the expected symbol at runtime?',
      expected_outcome: 'Inspecting the installed module declaration file (.d.ts) or running a one-line node repl inspection verifies the actual exported API instead of guessing alternate function names.',
      risk: 'Low: read-only type or runtime print.',
      probe: 'Run a one-line runtime export probe (e.g. node -e "console.log(Object.keys(await import(\'<module>\')))") or inspect the installed package .d.ts directly. Do not guess alternate names.',
    };
  }

  // 0.2 Clean Slate Rollback: Too many dirty files or stacked debugging edits polluting the signal
  const cleanSlateTriggers = [
    'dirty working tree',
    'too many modified files',
    'stacked changes',
    'revert noise',
    'messy diff',
    'uncommitted edits',
    'multiple files broken',
    'abandoned attempts',
  ];
  if (cleanSlateTriggers.some((t) => allText.includes(t)) || context.attempts.length >= 4) {
    return {
      strategy: 'clean-slate-rollback',
      question: 'Are uncommitted abandoned debug edits from prior failed attempts polluting the current failure signal?',
      expected_outcome: 'Reverting speculative scratch edits back to a clean git baseline eliminates secondary bugs introduced during debugging.',
      risk: 'Low: only discards failed scratch edits; preserves user work.',
      probe: 'Run "git status -s" and "git diff" to review uncommitted churn; discard failed speculative edits with "git checkout -- <file>" before testing another probe.',
    };
  }

  // 1. Wrong Altar: Code changes have no effect, unchanged output, wrong port/file/build artifact
  const wrongAltarTriggers = [
    'no effect',
    'unchanged',
    'same output',
    'same error',
    'did nothing',
    'not reflected',
    'cache',
    'wrong target',
    'build artifact',
    'stale process',
    'not running',
    'wrong port',
    'wrong file',
  ];
  if (wrongAltarTriggers.some((t) => allText.includes(t)) && context.attempts.length >= 1) {
    return {
      strategy: 'wrong-altar',
      question: 'Is the runtime process or test runner actually executing the exact file and build artifact being modified?',
      expected_outcome: 'A harmless marker, unique console print, or build identifier proves whether code edits are active or bypassed.',
      risk: 'Low: read-only or harmless diagnostic print; no mutation to production.',
      probe: 'Inject a unique non-secret runtime marker (e.g. console.error("RUNNING_TARGET_CHECK_<UUID>")) and inspect stdout/stderr.',
    };
  }

  // 2. Check the Check: Test passes while bug exists, or logs/coverage completely missing
  const checkTheCheckTriggers = [
    'test passes',
    'green test',
    'passing test',
    'no log',
    'missing log',
    'silent fail',
    'assertion not called',
    'never executed',
  ];
  if (checkTheCheckTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'check-the-check',
      question: 'Does the verification check or test suite reliably fail when a deliberate error is introduced?',
      expected_outcome: 'A deliberate syntax error or failing assertion confirms the test suite is actually executing the target code path.',
      risk: 'Low: temporary negative control in local environment; must restore immediately after run.',
      probe: 'Introduce a deliberate deliberate failing assertion (e.g. assert.strictEqual(1, 2)) in the test path and verify the test fails.',
    };
  }

  // 3. Assumption Audit: Candidate hypotheses treated as fact without empirical verification
  if (context.candidate_hypotheses.length > 0) {
    const primaryHypothesis = context.candidate_hypotheses[0];
    return {
      strategy: 'assumption-audit',
      question: `Is the candidate assumption '${primaryHypothesis}' empirically true?`,
      expected_outcome: 'A direct inspect or query isolates whether this hypothesis is supported by hard evidence or refuted.',
      risk: 'Low: read-only check or isolated query.',
      probe: `Design a single diagnostic probe that directly prints or asserts the truth value of: '${primaryHypothesis}'.`,
    };
  }

  // 4. Minimal Counterexample: Complex payload, multi-step pipeline, flaky or noisy repro
  const minimalReproTriggers = [
    'complex',
    'large payload',
    'pipeline',
    'flaky',
    'intermittent',
    'many steps',
    'timeout',
  ];
  if (minimalReproTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'minimal-counterexample',
      question: 'What is the smallest self-contained input that reproduces the failure?',
      expected_outcome: 'Stripping secondary dependencies and fields leaves a minimal isolated failure vector.',
      risk: 'Low: creates an isolated reproduction fixture.',
      probe: 'Halve the input payload or mock external dependencies until only the minimal failing invariant remains.',
    };
  }

  // 5. Divide and Conquer: Trace intermediate boundary values across execution steps
  const divideTriggers = [
    'intermediate',
    'data flow',
    'transform',
    'pipeline',
    'regression',
    'bisect',
    'chain',
  ];
  if (divideTriggers.some((t) => allText.includes(t))) {
    return {
      strategy: 'divide-and-conquer',
      question: 'At what intermediate processing boundary does the invariant break?',
      expected_outcome: 'Inspecting data right at the midpoint boundary eliminates half of the suspect subsystems.',
      risk: 'Low: log inspection at intermediate boundaries.',
      probe: 'Inspect and log the state/payload exactly midway between the entry point and the failure point.',
    };
  }

  // 6. Default: Subsystem Boundary Check
  return {
    strategy: 'boundary-check',
    question: 'What is the smallest observation that would separate the remaining hypotheses?',
    expected_outcome: 'A boundary check narrows the failing path to a single subsystem.',
    risk: 'Low: no mutation or production access is required by default.',
    probe: 'Compare inputs and outputs across the suspected component boundary before modifying neighboring code.',
  };
}

export function createOrResumeRecoverySession(
  input: {
    project_key?: string;
    request_id?: string;
    problem?: string;
    session_id?: string;
    expected_revision?: number;
    constraints?: string[];
    observations?: string[];
    attempts?: string[];
    candidate_hypotheses?: string[];
    capabilities?: string[];
    budget?: number;
    forced_strategy?: ExperimentStrategy;
  },
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  const project_key = input.project_key || 'default';
  const request_id = input.request_id || `req-${generateId()}`;

  // Idempotency check
  const cached = storage.getIdempotentResponse<RecoverySession>(request_id);
  if (cached) {
    return cached;
  }

  const problem = redactSecrets(input.problem || '');
  const constraints = (input.constraints || []).map(redactSecrets);
  const observations = (input.observations || []).map(redactSecrets);
  const attempts = (input.attempts || []).map(redactSecrets);
  const candidate_hypotheses = (input.candidate_hypotheses || []).map(redactSecrets);
  const capabilities = input.capabilities || [];

  // Case A: Resume an existing session
  if (input.session_id) {
    const existing = storage.getSession(project_key, input.session_id);
    if (!existing) {
      throw new Error('SESSION_NOT_FOUND');
    }

    if (input.expected_revision !== undefined && existing.revision !== input.expected_revision) {
      throw new Error(`STALE_REVISION: expected ${existing.revision}, received ${input.expected_revision}`);
    }

    const nextRevision = existing.revision + 1;
    const mergedFacts = Array.from(new Set([...existing.known_facts, ...observations]));
    const mergedAttempts = Array.from(new Set([...existing.rejected_approaches, ...attempts]));
    const mergedHypotheses = Array.from(new Set([...existing.assumptions_to_check, ...candidate_hypotheses]));

    const experiment = selectStrategy({
      problem: problem || existing.handoff,
      observations: mergedFacts,
      attempts: mergedAttempts,
      candidate_hypotheses: mergedHypotheses,
      capabilities,
      forced_strategy: input.forced_strategy,
    });

    const occultRite = STRATEGY_INCANTATIONS[experiment.strategy] || {
      rite: '🕯️ [THE RITE OF GROUND TRUTH]',
      incantation: 'Prayers are optional. Evidence is required.',
    };

    const textToScan = [problem || existing.handoff, ...mergedFacts, ...mergedAttempts, ...mergedHypotheses].join(' ');
    const hasApology = detectApologySlop(textToScan);
    const altar_warning = hasApology
      ? "🕯️ [THE ALTAR SCOWLS]: 'The Gods accept no apologies from mortals. Apologies do not pass test suites. State your single falsifiable hypothesis and execute the probe.'"
      : undefined;

    const nhan_pham = rollNhanPham({
      attemptsCount: mergedAttempts.length,
      hasApology,
    });

    const updated: RecoverySession = {
      ...existing,
      revision: nextRevision,
      assessment: 'possible_loop',
      next_action: 'experiment',
      decision: 'continue',
      experiment_id: `exp-${generateId()}`,
      experiment,
      constraints: Array.from(new Set([...(existing.constraints || []), ...constraints])),
      known_facts: mergedFacts,
      assumptions_to_check: mergedHypotheses,
      rejected_approaches: mergedAttempts,
      avoid_repeating: mergedAttempts,
      handoff: `${occultRite.rite} ${occultRite.incantation} | Resumed session ${input.session_id} (rev ${nextRevision}). Strategy: ${experiment.strategy}. Remaining hypotheses: ${mergedHypotheses.join('; ') || 'none'}.`,
      updated_at: Date.now(),
      rite: occultRite.rite,
      incantation: occultRite.incantation,
      nhan_pham,
      altar_warning,
    };

    storage.saveSession(updated);
    storage.saveIdempotentResponse(request_id, updated);
    return updated;
  }

  // Case B: Create brand new session
  const session_id = generateId();
  const experiment = selectStrategy({
    problem: problem || 'Execution loop or stall detected in current task.',
    observations,
    attempts,
    candidate_hypotheses,
    capabilities,
    forced_strategy: input.forced_strategy,
  });

  const occultRite = STRATEGY_INCANTATIONS[experiment.strategy] || {
    rite: '🕯️ [THE RITE OF GROUND TRUTH]',
    incantation: 'Prayers are optional. Evidence is required.',
  };

  const textToScan = [problem, ...observations, ...attempts, ...candidate_hypotheses].join(' ');
  const hasApology = detectApologySlop(textToScan);
  const altar_warning = hasApology
    ? "🕯️ [THE ALTAR SCOWLS]: 'The Gods accept no apologies from mortals. Apologies do not pass test suites. State your single falsifiable hypothesis and execute the probe.'"
    : undefined;

  const nhan_pham = rollNhanPham({
    attemptsCount: attempts.length,
    hasApology,
  });

  const session: RecoverySession = {
    session_id,
    project_key,
    revision: 1,
    assessment: attempts.length >= 2 ? 'possible_loop' : 'insufficient_evidence',
    next_action: 'experiment',
    decision: 'continue',
    experiment_id: `exp-${generateId()}`,
    experiment,
    constraints,
    known_facts: [...observations],
    assumptions_to_check: candidate_hypotheses,
    rejected_approaches: attempts,
    avoid_repeating: attempts,
    handoff: `${occultRite.rite} ${occultRite.incantation} | Goal: ${problem || 'Break execution loop'}. Constraints: ${constraints.join('; ') || 'none'}. Active strategy: ${experiment.strategy}.`,
    updated_at: Date.now(),
    rite: occultRite.rite,
    incantation: occultRite.incantation,
    nhan_pham,
    altar_warning,
  };

  storage.saveSession(session);
  storage.saveIdempotentResponse(request_id, session);
  return session;
}

export const createRecoverySession = createOrResumeRecoverySession;

export function reportOutcome(
  input: {
    project_key: string;
    session_id: string;
    expected_revision: number;
    request_id: string;
    experiment_id?: string;
    outcome: ExperimentOutcome;
    observations?: string[];
    checks?: Array<{ name: string; result: string }>;
  },
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  // Idempotency check
  const cached = storage.getIdempotentResponse<RecoverySession>(input.request_id);
  if (cached) {
    return cached;
  }

  const existing = storage.getSession(input.project_key, input.session_id);
  if (!existing) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (existing.revision !== input.expected_revision) {
    throw new Error(`STALE_REVISION: expected ${existing.revision}, received ${input.expected_revision}`);
  }

  if (input.experiment_id && existing.experiment_id && input.experiment_id !== existing.experiment_id) {
    throw new Error('UNKNOWN_EXPERIMENT');
  }

  const nextRevision = existing.revision + 1;
  const observations = input.observations || [];
  const checks = input.checks || [];

  const decision: RecoveryDecision =
    input.outcome === 'supports' ? 'continue' :
    input.outcome === 'contradicts' ? 'pivot' :
    input.outcome === 'blocked' ? 'ask_user' : 'ready_to_verify';

  const mergedFacts = Array.from(new Set([...existing.known_facts, ...observations]));
  
  // If experiment contradicted, record the failed strategy/hypothesis as a rejected approach
  const mergedRejected = [...existing.rejected_approaches];
  if (input.outcome === 'contradicts' && existing.experiment) {
    mergedRejected.push(`${existing.experiment.strategy}: ${existing.experiment.question}`);
  }

  // Determine next action and experiment
  let nextAction: RecoveryNextAction = 'experiment';
  let nextExperiment: Experiment | undefined = undefined;

  if (decision === 'ask_user') {
    nextAction = 'ask_user';
  } else if (decision === 'ready_to_verify') {
    nextAction = 'request_evidence';
  } else {
    // continue or pivot
    nextAction = 'experiment';
    nextExperiment = selectStrategy({
      problem: existing.handoff,
      observations: mergedFacts,
      attempts: mergedRejected,
      candidate_hypotheses: existing.assumptions_to_check,
      capabilities: [],
    });
  }

  const updated: RecoverySession = {
    ...existing,
    revision: nextRevision,
    assessment: input.outcome === 'supports' ? 'progress' : input.outcome === 'blocked' ? 'blocked' : 'insufficient_evidence',
    decision,
    next_action: nextAction,
    experiment_id: nextExperiment ? `exp-${generateId()}` : undefined,
    experiment: nextExperiment,
    constraints: existing.constraints || [],
    known_facts: mergedFacts,
    rejected_approaches: mergedRejected,
    avoid_repeating: mergedRejected,
    handoff: `Outcome: ${input.outcome}. Checks: ${checks.map((c) => `${c.name}=${c.result}`).join(', ') || 'none'}. Next decision: ${decision}.`,
    updated_at: Date.now(),
  };

  storage.saveSession(updated);
  storage.saveIdempotentResponse(input.request_id, updated);
  return updated;
}

export function inspectSession(
  project_key: string,
  session_id: string,
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  const session = storage.getSession(project_key, session_id);
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  return session;
}

export function listSessions(
  project_key?: string,
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession[] {
  return storage.listSessions(project_key);
}
