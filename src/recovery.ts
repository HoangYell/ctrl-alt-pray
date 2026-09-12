import { getDefaultStorage, RecoveryStorage } from './storage.js';

export type RecoveryAssessment = 'insufficient_evidence' | 'possible_loop' | 'progress' | 'blocked';
export type RecoveryNextAction = 'experiment' | 'request_evidence' | 'ask_user';
export type RecoveryDecision = 'continue' | 'pivot' | 'ask_user' | 'ready_to_verify';
export type ExperimentOutcome = 'supports' | 'contradicts' | 'inconclusive' | 'blocked';

export type ExperimentStrategy =
  | 'wrong-altar'
  | 'check-the-check'
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
  known_facts: string[];
  assumptions_to_check: string[];
  rejected_approaches: string[];
  handoff: string;
  updated_at?: number;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

/**
 * Deterministic strategy selector matching PLAN.md section 6 catalog.
 */
export function selectStrategy(context: {
  problem: string;
  observations: string[];
  attempts: string[];
  candidate_hypotheses: string[];
  capabilities: string[];
}): Experiment {
  const allText = [
    context.problem,
    ...context.observations,
    ...context.attempts,
    ...context.candidate_hypotheses,
  ].join(' ').toLowerCase();

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
    project_key: string;
    request_id: string;
    problem: string;
    session_id?: string;
    expected_revision?: number;
    constraints?: string[];
    observations?: string[];
    attempts?: string[];
    candidate_hypotheses?: string[];
    capabilities?: string[];
    budget?: number;
  },
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  // Idempotency check
  const cached = storage.getIdempotentResponse<RecoverySession>(input.request_id);
  if (cached) {
    return cached;
  }

  const constraints = input.constraints || [];
  const observations = input.observations || [];
  const attempts = input.attempts || [];
  const candidate_hypotheses = input.candidate_hypotheses || [];
  const capabilities = input.capabilities || [];

  // Case A: Resume an existing session
  if (input.session_id) {
    const existing = storage.getSession(input.project_key, input.session_id);
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
      problem: input.problem || existing.handoff,
      observations: mergedFacts,
      attempts: mergedAttempts,
      candidate_hypotheses: mergedHypotheses,
      capabilities,
    });

    const updated: RecoverySession = {
      ...existing,
      revision: nextRevision,
      assessment: 'possible_loop',
      next_action: 'experiment',
      decision: 'continue',
      experiment_id: `exp-${generateId()}`,
      experiment,
      known_facts: mergedFacts,
      assumptions_to_check: mergedHypotheses,
      rejected_approaches: mergedAttempts,
      handoff: `Resumed session ${input.session_id} (rev ${nextRevision}). Strategy: ${experiment.strategy}. Remaining hypotheses: ${mergedHypotheses.join('; ') || 'none'}.`,
      updated_at: Date.now(),
    };

    storage.saveSession(updated);
    storage.saveIdempotentResponse(input.request_id, updated);
    return updated;
  }

  // Case B: Create brand new session
  const session_id = generateId();
  const experiment = selectStrategy({
    problem: input.problem,
    observations,
    attempts,
    candidate_hypotheses,
    capabilities,
  });

  const session: RecoverySession = {
    session_id,
    project_key: input.project_key,
    revision: 1,
    assessment: attempts.length >= 2 ? 'possible_loop' : 'insufficient_evidence',
    next_action: 'experiment',
    decision: 'continue',
    experiment_id: `exp-${generateId()}`,
    experiment,
    known_facts: [...observations],
    assumptions_to_check: candidate_hypotheses,
    rejected_approaches: attempts,
    handoff: `Goal: ${input.problem}. Constraints: ${constraints.join('; ') || 'none'}. Active strategy: ${experiment.strategy}.`,
    updated_at: Date.now(),
  };

  storage.saveSession(session);
  storage.saveIdempotentResponse(input.request_id, session);
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
    known_facts: mergedFacts,
    rejected_approaches: mergedRejected,
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
