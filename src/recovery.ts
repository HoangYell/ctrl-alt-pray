export type RecoveryAssessment = 'insufficient_evidence' | 'possible_loop' | 'progress' | 'blocked';
export type RecoveryNextAction = 'experiment' | 'request_evidence' | 'ask_user';
export type RecoveryDecision = 'continue' | 'pivot' | 'ask_user' | 'ready_to_verify';
export type ExperimentOutcome = 'supports' | 'contradicts' | 'inconclusive' | 'blocked';

export type RecoverySession = {
  session_id: string;
  project_key: string;
  revision: number;
  assessment: RecoveryAssessment;
  next_action: RecoveryNextAction;
  decision: RecoveryDecision;
  experiment_id?: string;
  experiment?: {
    strategy: string;
    question: string;
    expected_outcome: string;
    risk: string;
  };
  known_facts: string[];
  assumptions_to_check: string[];
  rejected_approaches: string[];
  handoff: string;
};

const sessions = new Map<string, RecoverySession>();

const generateId = () => Math.random().toString(36).slice(2, 10);

export function createRecoverySession(input: {
  project_key: string;
  request_id: string;
  problem: string;
  constraints: string[];
  observations: string[];
  attempts: string[];
  candidate_hypotheses: string[];
  capabilities: string[];
  budget: number;
}): RecoverySession {
  const session_id = generateId();
  const session: RecoverySession = {
    session_id,
    project_key: input.project_key,
    revision: 1,
    assessment: 'possible_loop',
    next_action: 'experiment',
    decision: 'continue',
    experiment_id: `exp-${generateId()}`,
    experiment: {
      strategy: 'boundary-check',
      question: 'What is the smallest observation that would separate the remaining hypotheses?',
      expected_outcome: 'A boundary check narrows the failing path to a single subsystem.',
      risk: 'Low: no mutation or production access is required by default.',
    },
    known_facts: [...input.observations],
    assumptions_to_check: input.candidate_hypotheses,
    rejected_approaches: input.attempts,
    handoff: `Goal: ${input.problem}. Constraints: ${input.constraints.join('; ') || 'none'}. Remaining hypotheses: ${input.candidate_hypotheses.join('; ') || 'not provided'}.`,
  };

  sessions.set(`${input.project_key}:${session_id}`, session);
  return session;
}

export function reportOutcome(input: {
  project_key: string;
  session_id: string;
  expected_revision: number;
  request_id: string;
  experiment_id?: string;
  outcome: ExperimentOutcome;
  observations: string[];
  checks: Array<{ name: string; result: string }>;
}): RecoverySession {
  const key = `${input.project_key}:${input.session_id}`;
  const existing = sessions.get(key);

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
  const decision: RecoveryDecision =
    input.outcome === 'supports' ? 'continue' :
    input.outcome === 'contradicts' ? 'pivot' :
    input.outcome === 'blocked' ? 'ask_user' : 'ready_to_verify';

  const updated: RecoverySession = {
    ...existing,
    revision: nextRevision,
    assessment: input.outcome === 'supports' ? 'progress' : 'insufficient_evidence',
    decision,
    next_action: decision === 'continue' ? 'experiment' : decision === 'pivot' ? 'request_evidence' : 'ask_user',
    known_facts: [...existing.known_facts, ...input.observations],
    handoff: `Outcome: ${input.outcome}. Evidence: ${input.observations.join('; ') || 'none'}. Next decision: ${decision}.`,
  };

  sessions.set(key, updated);
  return updated;
}
