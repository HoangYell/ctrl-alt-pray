import {
  getDefaultStorage,
  RecoveryStorage,
  validateRequestLimits,
} from './storage.js';
import {
  generateId,
  type Experiment,
  type ExperimentOutcome,
  type ExperimentStrategy,
  type FalsificationRubric,
  type FileFlappingStatus,
  type HeresyChallenge,
  type PathologyType,
  type RecoveryAssessment,
  type RecoveryDecision,
  type RecoveryNextAction,
  type RecoverySession,
  type SecondOpinion,
  type TheOffering,
} from './recovery-types.js';
import { detectApologySlop, redactSecrets, rollDivineFavor } from './recovery-security.js';
import { evaluateExperimentRubric } from './recovery-rubric.js';
import { detectFileFlapping, diagnosePathology, generateHeresyChallenge } from './recovery-pathology.js';
import { generateTheOffering, selectStrategy, STRATEGY_INCANTATIONS } from './recovery-strategy.js';

export type {
  ExperimentOutcome,
  ExperimentStrategy,
  Experiment,
  FalsificationRubric,
  FileFlappingStatus,
  HeresyChallenge,
  PathologyType,
  RecoveryAssessment,
  RecoveryDecision,
  RecoveryNextAction,
  RecoverySession,
  SecondOpinion,
  TheOffering,
};
export {
  detectApologySlop,
  detectFileFlapping,
  diagnosePathology,
  evaluateExperimentRubric,
  generateHeresyChallenge,
  generateTheOffering,
  redactSecrets,
  rollDivineFavor,
  selectStrategy,
  STRATEGY_INCANTATIONS,
};

export function createOrResumeRecoverySession(
  input: {
    schema_version?: number;
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
    heresy_mode?: boolean;
  },
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  // Validate limits (PLAN.md Section 8)
  validateRequestLimits(input);

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

  // Diagnose pathology (PLAN.md Section 18.A)
  const { pathology, rationale: pathology_rationale } = diagnosePathology({
    problem,
    observations,
    attempts,
    candidate_hypotheses,
  });

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
    let altar_warning = hasApology
      ? "🕯️ [THE ALTAR SCOWLS]: 'The Gods accept no apologies from mortals. Apologies do not pass test suites. State your single falsifiable hypothesis and execute the probe.'"
      : undefined;

    const file_flapping = detectFileFlapping({ attempts: mergedAttempts, observations: mergedFacts });
    if (file_flapping) {
      const flapWarn = `🚨 [FLAPPING SENTINEL]: Edit oscillation detected on "${file_flapping.file}". Permissions locked. Reverting to clean baseline.`;
      altar_warning = altar_warning ? `${altar_warning}\n${flapWarn}` : flapWarn;
    }

    const divine_favor = rollDivineFavor({
      attemptsCount: mergedAttempts.length,
      hasApology,
    });

    const next_action = experiment.strategy === 'human-checkpoint' ? 'ask_user' : 'experiment';

    const heresy_challenge = (input.heresy_mode || mergedAttempts.length >= 3 || nextRevision >= 3)
      ? generateHeresyChallenge(pathology, mergedHypotheses[0])
      : existing.heresy_challenge;

    let offering: TheOffering | undefined = undefined;
    if (next_action === 'ask_user' || experiment.strategy === 'minimal-counterexample' || experiment.strategy === 'controlled-substitution') {
      offering = generateTheOffering({
        pathology,
        strategy: experiment.strategy,
        problem: problem || existing.handoff,
      });
    }

    const updated: RecoverySession = {
      ...existing,
      schema_version: input.schema_version || existing.schema_version || 1,
      revision: nextRevision,
      assessment: 'possible_loop',
      next_action,
      decision: 'continue',
      pathology,
      pathology_rationale,
      falsification: experiment.falsification,
      experiment_id: `exp-${generateId()}`,
      experiment,
      constraints: Array.from(new Set([...(existing.constraints || []), ...constraints])),
      known_facts: mergedFacts,
      assumptions_to_check: mergedHypotheses,
      rejected_approaches: mergedAttempts,
      avoid_repeating: mergedAttempts,
      handoff: `${occultRite.rite} ${occultRite.incantation} | Resumed session ${input.session_id} (rev ${nextRevision}). Pathology: ${pathology}. Strategy: ${experiment.strategy}. Remaining hypotheses: ${mergedHypotheses.join('; ') || 'none'}.`,
      updated_at: Date.now(),
      rite: occultRite.rite,
      incantation: occultRite.incantation,
      divine_favor,
      altar_warning,
      verification_status: existing.verification_status || 'not_verified',
      heresy_challenge,
      offering,
      file_flapping: file_flapping || existing.file_flapping,
      second_opinion: existing.second_opinion,
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
  let altar_warning = hasApology
    ? "🕯️ [THE ALTAR SCOWLS]: 'The Gods accept no apologies from mortals. Apologies do not pass test suites. State your single falsifiable hypothesis and execute the probe.'"
    : undefined;

  const file_flapping = detectFileFlapping({ attempts, observations });
  if (file_flapping) {
    const flapWarn = `🚨 [FLAPPING SENTINEL]: Edit oscillation detected on "${file_flapping.file}". Permissions locked. Reverting to clean baseline.`;
    altar_warning = altar_warning ? `${altar_warning}\n${flapWarn}` : flapWarn;
  }

  const divine_favor = rollDivineFavor({
    attemptsCount: attempts.length,
    hasApology,
  });

  const assessment = attempts.length >= 2 ? 'possible_loop' : 'insufficient_evidence';
  const next_action = experiment.strategy === 'human-checkpoint' ? 'ask_user' : 'experiment';

  const heresy_challenge = (input.heresy_mode || attempts.length >= 3)
    ? generateHeresyChallenge(pathology, candidate_hypotheses[0])
    : undefined;

  let offering: TheOffering | undefined = undefined;
  if (next_action === 'ask_user' || assessment === 'insufficient_evidence' || experiment.strategy === 'minimal-counterexample' || experiment.strategy === 'controlled-substitution') {
    offering = generateTheOffering({
      pathology,
      strategy: experiment.strategy,
      problem: problem || 'Execution loop or stall detected in current task.',
    });
  }

  const session: RecoverySession = {
    schema_version: input.schema_version || 1,
    session_id,
    project_key,
    revision: 1,
    assessment,
    next_action,
    decision: 'continue',
    pathology,
    pathology_rationale,
    falsification: experiment.falsification,
    experiment_id: `exp-${generateId()}`,
    experiment,
    constraints,
    known_facts: [...observations],
    assumptions_to_check: candidate_hypotheses,
    rejected_approaches: attempts,
    avoid_repeating: attempts,
    handoff: `${occultRite.rite} ${occultRite.incantation} | Goal: ${problem || 'Break execution loop'}. Pathology: ${pathology}. Constraints: ${constraints.join('; ') || 'none'}. Active strategy: ${experiment.strategy}.`,
    updated_at: Date.now(),
    rite: occultRite.rite,
    incantation: occultRite.incantation,
    divine_favor,
    altar_warning,
    verification_status: 'not_verified',
    heresy_challenge,
    offering,
    file_flapping,
  };

  storage.saveSession(session);
  storage.saveIdempotentResponse(request_id, session);
  return session;
}

export const createRecoverySession = createOrResumeRecoverySession;

export function reportOutcome(
  input: {
    schema_version?: number;
    project_key: string;
    session_id: string;
    expected_revision: number;
    request_id: string;
    experiment_id?: string;
    outcome: ExperimentOutcome;
    observations?: string[];
    changes?: string[];
    checks?: Array<{ name: string; result: string }>;
    cost?: { duration_ms?: number; tool_calls?: number; tokens?: number };
  },
  storage: RecoveryStorage = getDefaultStorage(),
): RecoverySession {
  // Validate limits
  validateRequestLimits(input);

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
  const changes = input.changes || [];

  const decision: RecoveryDecision =
    input.outcome === 'supports'
      ? 'continue'
      : input.outcome === 'contradicts'
        ? 'pivot'
        : input.outcome === 'blocked'
          ? 'ask_user'
          : 'ready_to_verify';

  const mergedFacts = Array.from(new Set([...existing.known_facts, ...observations]));

  // If experiment contradicted, record the failed strategy/hypothesis as a rejected approach
  const mergedRejected = [...existing.rejected_approaches];
  if (input.outcome === 'contradicts' && existing.experiment) {
    mergedRejected.push(`${existing.experiment.strategy}: ${existing.experiment.question}`);
  }

  // Determine verification status (PLAN.md Section 5)
  let verification_status: 'not_verified' | 'partially_verified' | 'verified_against_declared_checks' = 'not_verified';
  if (checks.length > 0) {
    const allPassed = checks.every((c) => /pass|ok|true|success/i.test(c.result));
    const anyPassed = checks.some((c) => /pass|ok|true|success/i.test(c.result));
    if (allPassed && input.outcome === 'supports') {
      verification_status = 'verified_against_declared_checks';
    } else if (anyPassed) {
      verification_status = 'partially_verified';
    }
  }

  // Determine progress reason (PLAN.md Section 5)
  let progress_reason = 'No new discriminating information added.';
  if (input.outcome === 'supports') {
    progress_reason = `New distinction learned: experiment supported hypothesis "${existing.experiment?.question || 'active probe'}". Subsystem isolated.`;
  } else if (input.outcome === 'contradicts') {
    progress_reason = `Negative distinction learned: refuted hypothesis "${existing.experiment?.question || 'active probe'}". Eliminated invalid approach.`;
  } else if (input.outcome === 'blocked') {
    progress_reason = 'Recovery segment blocked: missing external dependency, permission, or human decision.';
  } else if (input.outcome === 'inconclusive') {
    progress_reason = 'No new discriminating information added. Retain prior state and narrow probe.';
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

  let offering: TheOffering | undefined = undefined;
  if (nextAction === 'ask_user' || nextAction === 'request_evidence' || nextExperiment?.strategy === 'minimal-counterexample' || nextExperiment?.strategy === 'controlled-substitution') {
    offering = generateTheOffering({
      pathology: existing.pathology || 'unspecified',
      strategy: nextExperiment?.strategy || existing.experiment?.strategy || 'boundary-check',
      problem: existing.handoff,
    });
  }

  const heresy_challenge = (nextRevision >= 3 && !existing.heresy_challenge)
    ? generateHeresyChallenge(existing.pathology || 'unspecified', existing.assumptions_to_check[0])
    : existing.heresy_challenge;

  const updated: RecoverySession = {
    ...existing,
    schema_version: input.schema_version || existing.schema_version || 1,
    revision: nextRevision,
    assessment:
      input.outcome === 'supports'
        ? 'progress'
        : input.outcome === 'blocked'
          ? 'blocked'
          : 'insufficient_evidence',
    decision,
    next_action: nextAction,
    experiment_id: nextExperiment ? `exp-${generateId()}` : undefined,
    experiment: nextExperiment,
    falsification: nextExperiment?.falsification,
    constraints: existing.constraints || [],
    known_facts: mergedFacts,
    rejected_approaches: mergedRejected,
    avoid_repeating: mergedRejected,
    verification_status,
    progress_reason,
    changes,
    cost: input.cost,
    handoff: `Outcome: ${input.outcome}. Checks: ${checks.map((c) => `${c.name}=${c.result}`).join(', ') || 'none'}. Next decision: ${decision}.`,
    updated_at: Date.now(),
    heresy_challenge,
    offering: offering || existing.offering,
    file_flapping: existing.file_flapping,
    second_opinion: existing.second_opinion,
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
