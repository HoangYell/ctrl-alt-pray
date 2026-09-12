import type { SecondOpinion } from './critique.js';

export type { SecondOpinion } from './critique.js';

export type RecoveryAssessment = 'insufficient_evidence' | 'possible_loop' | 'progress' | 'blocked';
export type RecoveryNextAction = 'experiment' | 'request_evidence' | 'ask_user';
export type RecoveryDecision = 'continue' | 'pivot' | 'ask_user' | 'ready_to_verify';
export type ExperimentOutcome = 'supports' | 'contradicts' | 'inconclusive' | 'blocked';

export type PathologyType =
  | 'ghost'
  | 'phantom'
  | 'altar-clash'
  | 'false-green'
  | 'code-sepsis'
  | 'doom-flip'
  | 'unspecified';

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

export interface FalsificationRubric {
  score: number; // 0-100
  passed: boolean; // score >= 60
  breakdown: {
    discriminative_power: number; // 0-30
    scope_minimality: number; // 0-30
    negative_control: number; // 0-20
    clean_rollback: number; // 0-20
  };
  feedback: string;
}

export interface Experiment {
  strategy: ExperimentStrategy;
  question: string;
  expected_outcome: string;
  risk: string;
  probe: string;
  falsification?: FalsificationRubric;
}

export interface RecoverySession {
  schema_version: number;
  session_id: string;
  project_key: string;
  revision: number;
  assessment: RecoveryAssessment;
  next_action: RecoveryNextAction;
  decision: RecoveryDecision;
  pathology?: PathologyType;
  pathology_rationale?: string;
  falsification?: FalsificationRubric;
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
  divine_favor?: { score: number; verdict: string };
  altar_warning?: string;
  verification_status?: 'not_verified' | 'partially_verified' | 'verified_against_declared_checks';
  progress_reason?: string;
  changes?: string[];
  cost?: { duration_ms?: number; tool_calls?: number; tokens?: number };
  heresy_challenge?: HeresyChallenge;
  offering?: TheOffering;
  file_flapping?: FileFlappingStatus;
  second_opinion?: SecondOpinion;
}

export interface HeresyChallenge {
  dogma: string;
  counter_premise: string;
  probe: string;
  rite: string;
}

export interface TheOffering {
  type: 'minimal_input' | 'sanitized_trace' | 'known_good_comparison' | 'product_decision';
  description: string;
  template: string;
}

export interface FileFlappingStatus {
  file: string;
  revertCount: number;
  locked: boolean;
}

export const generateId = () => Math.random().toString(36).slice(2, 10);
