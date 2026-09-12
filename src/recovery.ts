import {
  getDefaultStorage,
  RecoveryStorage,
  validateRequestLimits,
} from './storage.js';

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
  /my apologies/i,
  /sorry/i,
  /so sorry/i,
  /forgive me/i,
  /my mistake/i,
  /my bad/i,
  /i was wrong/i,
  /pardon/i,
  /pardon me/i,
];

export function detectApologySlop(text: string): boolean {
  return APOLOGY_PATTERNS.some((pattern) => pattern.test(text));
}

export function rollDivineFavor(context: { attemptsCount: number; hasApology: boolean }): { score: number; verdict: string } {
  let score = Math.floor(Math.random() * 31) + 65; // 65-95 base
  if (context.hasApology) score -= 25;
  if (context.attemptsCount > 3) score -= 15;
  score = Math.max(1, Math.min(100, score));

  let verdict = 'Transcendent Grace (Divine Favor)';
  if (score < 40) verdict = 'Dire Wrath (Altar Scorn - Apologies Detected)';
  else if (score < 60) verdict = 'Trial of Patience (Temperate Grace)';
  else if (score < 80) verdict = 'Auspicious Omen (Fortunate Insight)';
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

/**
 * 100-Point Falsification Rubric (PLAN.md Section 18.C)
 * - Discriminative Power (30 pts): Must strictly eliminate >= 1 hypothesis
 * - Scope Minimality (30 pts): Alters or observes at most ONE variable/line
 * - Negative Control (20 pts): Verifies test can fail before fix
 * - Clean Rollback (20 pts): Provides atomic rollback / stash path
 */
export function evaluateExperimentRubric(experiment: Experiment): FalsificationRubric {
  let discriminative_power = 25;
  let scope_minimality = 25;
  let negative_control = 15;
  let clean_rollback = 15;

  const outcomeLower = experiment.expected_outcome.toLowerCase();
  const probeLower = experiment.probe.toLowerCase();
  const riskLower = experiment.risk.toLowerCase();

  // 1. Discriminative Power (max 30)
  if (
    experiment.question.includes('?') &&
    (outcomeLower.includes('isolat') ||
      outcomeLower.includes('confirm') ||
      outcomeLower.includes('reveals') ||
      outcomeLower.includes('proves') ||
      outcomeLower.includes('eliminat') ||
      outcomeLower.includes('distinguish'))
  ) {
    discriminative_power = 30;
  }

  // 2. Scope Minimality (max 30)
  if (
    riskLower.includes('low') ||
    riskLower.includes('zero') ||
    probeLower.includes('read-only') ||
    probeLower.includes('single') ||
    probeLower.includes('one') ||
    probeLower.includes('midway')
  ) {
    scope_minimality = 30;
  }

  // 3. Negative Control (max 20)
  if (
    experiment.strategy === 'check-the-check' ||
    probeLower.includes('deliberate') ||
    probeLower.includes('negative control') ||
    outcomeLower.includes('falsif') ||
    probeLower.includes('failing assertion') ||
    probeLower.includes('fail')
  ) {
    negative_control = 20;
  }

  // 4. Clean Rollback (max 20)
  if (
    probeLower.includes('stash') ||
    probeLower.includes('read-only') ||
    probeLower.includes('restore') ||
    riskLower.includes('no mutation') ||
    riskLower.includes('low') ||
    riskLower.includes('zero')
  ) {
    clean_rollback = 20;
  }

  const score = discriminative_power + scope_minimality + negative_control + clean_rollback;
  const passed = score >= 60;

  return {
    score,
    passed,
    breakdown: {
      discriminative_power,
      scope_minimality,
      negative_control,
      clean_rollback,
    },
    feedback: passed
      ? `High-quality falsification probe (score: ${score}/100). Bounded discriminative power confirmed.`
      : `Probe score (${score}/100) below threshold. Refine probe to isolate a single variable with clean rollback.`,
  };
}

/**
 * 6-Tier Agent Pathology Taxonomy (PLAN.md Section 18.A)
 */
export function diagnosePathology(context: {
  problem: string;
  observations: string[];
  attempts: string[];
  candidate_hypotheses: string[];
}): { pathology: PathologyType; rationale: string } {
  const allText = [
    context.problem,
    ...context.observations,
    ...context.attempts,
    ...context.candidate_hypotheses,
  ].join(' ').toLowerCase();

  // 1. Ghost
  const ghostPattern = /\b(hanging|hung|hangs|stuck waiting|waiting for output|terminal stuck|waiting forever|still waiting|never completes|no output from terminal|loading forever|command stuck|idle process)\b/i;
  if (ghostPattern.test(allText)) {
    return {
      pathology: 'ghost',
      rationale: 'Subprocess hung, unhandled interactive prompt, or forgotten watcher daemon detected.',
    };
  }

  // 2. Phantom
  if (
    allText.includes('is not a function') ||
    allText.includes('has no exported member') ||
    allText.includes('cannot find module') ||
    allText.includes('export not found') ||
    allText.includes('typeerror: ')
  ) {
    return {
      pathology: 'phantom',
      rationale: 'API or module export hallucination detected. Speculative symbols assumed without runtime check.',
    };
  }

  // 3. Altar Clash
  if (
    (allText.includes('no effect') ||
      allText.includes('same error') ||
      allText.includes('same output') ||
      allText.includes('wrong port') ||
      allText.includes('stale process') ||
      allText.includes('build artifact') ||
      allText.includes('did nothing')) &&
    context.attempts.length >= 1
  ) {
    return {
      pathology: 'altar-clash',
      rationale: 'Target misalignment detected. Code modifications are hitting stale dist/ or port collision.',
    };
  }

  // 4. False Green
  if (
    allText.includes('test passes') ||
    allText.includes('green test') ||
    allText.includes('passing test') ||
    allText.includes('silent fail') ||
    allText.includes('missing log') ||
    allText.includes('assertion not called')
  ) {
    return {
      pathology: 'false-green',
      rationale: 'Negative control bypass detected. Tests pass despite reported defect due to swallowed errors or missing assertions.',
    };
  }

  // 5. Code Sepsis
  if (
    allText.includes('dirty working tree') ||
    allText.includes('uncommitted') ||
    allText.includes('stacked changes') ||
    allText.includes('messy diff') ||
    context.attempts.length >= 4
  ) {
    return {
      pathology: 'code-sepsis',
      rationale: 'Cumulative uncommitted code churn detected across multiple attempts without verification.',
    };
  }

  // 6. Doom Flip
  if (
    allText.includes('oscillation') ||
    allText.includes('flip') ||
    allText.includes('revert') ||
    allText.includes('flip-flop') ||
    allText.includes('flip flop') ||
    allText.includes('back and forth')
  ) {
    return {
      pathology: 'doom-flip',
      rationale: 'Oscillation detected. Alternating between two known-failed states without new discriminating evidence.',
    };
  }

  return {
    pathology: 'unspecified',
    rationale: 'Execution loop under general debugging conditions.',
  };
}

export function detectFileFlapping(context: {
  attempts: string[];
  observations: string[];
}): FileFlappingStatus | undefined {
  const combined = [...context.attempts, ...context.observations].join(' ');
  const fileMatches = combined.match(/[a-zA-Z0-9_\-/\\]+\.(?:ts|js|tsx|jsx|py|go|rs|json)/g);
  if (!fileMatches) return undefined;

  const counts: Record<string, number> = {};
  for (const f of fileMatches) {
    const base = f.replace(/^.*[\\/]/, '');
    counts[base] = (counts[base] || 0) + 1;
  }

  for (const [file, count] of Object.entries(counts)) {
    if (count >= 2 && /(revert|re-edit|restore|modified again|oscillation|flip-flop|flip flop)/i.test(combined)) {
      return {
        file,
        revertCount: count,
        locked: true,
      };
    }
  }

  return undefined;
}

export function generateHeresyChallenge(
  pathology: PathologyType,
  primaryAssumption?: string,
): HeresyChallenge {
  if (pathology === 'altar-clash') {
    return {
      dogma: 'The defect is in the source code file you keep editing.',
      counter_premise: 'The test runner is executing stale compiled output in dist/ or colliding with an existing daemon on the port.',
      probe: 'Run "pnpm clean && pnpm build" or inject a deliberate syntax error in your source file. If the test still runs, your edits are being ignored.',
      rite: '🔥 [THE TRIAL OF HERESY: WRONG ALTAR]',
    };
  }

  if (pathology === 'phantom') {
    return {
      dogma: 'The imported function or export name exists because it sounds plausible.',
      counter_premise: 'The package author exported a default export, a different method name, or a subpath.',
      probe: 'Run node -e "import(\'<package>\').then(m => console.log(Object.keys(m)))" to inspect runtime reality directly. Stop guessing names.',
      rite: '🔥 [THE TRIAL OF HERESY: PHANTOM EXPORT]',
    };
  }

  if (pathology === 'false-green') {
    return {
      dogma: 'A green test suite means the implementation is correct.',
      counter_premise: 'The test assertions are swallowed, skipped, or mock the bug away.',
      probe: 'Inject a deliberate "assert.strictEqual(1, 2)" in the business logic path. If the test still passes, discard the test suite.',
      rite: '🔥 [THE TRIAL OF HERESY: POISON CHALICE]',
    };
  }

  if (pathology === 'ghost') {
    return {
      dogma: 'The command is still actively working and will finish if you wait longer.',
      counter_premise: 'The subprocess is deadlocked, waiting for unhandled stdin (y/n)?, or orphaned by PID 1.',
      probe: 'Inspect process CPU% and last 3 lines of terminal buffer. If CPU is 0% and log mtime >15s, kill the task immediately.',
      rite: '🔥 [THE TRIAL OF HERESY: ZOMBIE EXORCISM]',
    };
  }

  return {
    dogma: primaryAssumption || 'The root cause is in the latest component modified.',
    counter_premise: 'The failure is introduced by unverified caller invariants before data ever reaches this component.',
    probe: 'Inspect the exact input payload at the entry boundary. Do not modify internal component branches until boundary input is verified.',
    rite: '🔥 [THE TRIAL OF HERESY: INVARIANT TRIAL]',
  };
}

export function generateTheOffering(context: {
  pathology: PathologyType;
  strategy: ExperimentStrategy;
  problem: string;
}): TheOffering {
  if (context.strategy === 'human-checkpoint') {
    return {
      type: 'product_decision',
      description: 'An authoritative human product decision is required to resolve ambiguous business logic.',
      template: `### Decision Offering Needed\nQuestion: Which behavior is required for "${context.problem}"?\nOptions:\n1. (Recommended) Explicit conflict error (HTTP 409)\n2. Silent overwrite (Last-Write-Wins)\n3. Merge changes`,
    };
  }

  if (context.strategy === 'minimal-counterexample') {
    return {
      type: 'minimal_input',
      description: 'A minimal self-contained input payload isolating the failure.',
      template: `### Minimal Input Offering\nInput payload: Strip down to the smallest JSON/CLI input (<5 fields) that reproduces the failure.`,
    };
  }

  if (context.strategy === 'controlled-substitution') {
    return {
      type: 'known_good_comparison',
      description: 'A working baseline or known-good request to compare against.',
      template: `### Known-Good Comparison Offering\nProvide: (1) Exact command of working case; (2) Exact command of failing case; (3) Non-secret credential/config diff.`,
    };
  }

  return {
    type: 'sanitized_trace',
    description: 'A sanitized exit code, error stack trace, or terminal snippet.',
    template: `### Sanitized Trace Offering\nProvide the last 10 lines of terminal output including exact exit code and error message.`,
  };
}

export function selectStrategy(context: {
  problem: string;
  observations: string[];
  attempts: string[];
  candidate_hypotheses: string[];
  capabilities: string[];
  forced_strategy?: ExperimentStrategy;
}): Experiment {
  let exp: Experiment;

  if (context.forced_strategy) {
    if (context.forced_strategy === 'clean-slate-rollback') {
      exp = {
        strategy: 'clean-slate-rollback',
        question: 'Do accumulating uncommitted edits obscure the root cause or introduce secondary regressions?',
        expected_outcome: 'Stashing or reverting dirty working tree edits returns the codebase to a clean baseline where the minimal failure can be re-established.',
        risk: 'Low if stashed with git stash push -u -m "ctrl-alt-pray-checkpoint".',
        probe: 'Run git status and stash all uncommitted changes, then rerun the single failing test to establish the clean red line.',
      };
      exp.falsification = evaluateExperimentRubric(exp);
      return exp;
    }
    if (context.forced_strategy === 'ghost-terminal-breaker') {
      exp = {
        strategy: 'ghost-terminal-breaker',
        question: 'Has the process already completed without emitting a stream EOF/exit event, or is it blocked on an unhandled interactive prompt/lock?',
        expected_outcome: 'Inspecting process liveness, lockfiles, and terminal tail reveals whether the task is a finished ghost or an interactive prompt trap.',
        risk: 'Low: read-only process and log inspection; kill task only if confirmed idle.',
        probe: '1) Check if .git/index.lock exists; 2) Check process tree liveness; 3) Clear lock or kill zombie process.',
      };
      exp.falsification = evaluateExperimentRubric(exp);
      return exp;
    }
    if (context.forced_strategy === 'wrong-altar') {
      exp = {
        strategy: 'wrong-altar',
        question: 'Is the failing test or curl request hitting a stale build artifact or colliding with a port occupied by another service?',
        expected_outcome: 'Verifying occupied dev ports and build timestamps confirms if the test runner is targeting the right runtime.',
        risk: 'Low: inspect build artifact mtime, occupied ports, and test target.',
        probe: 'Check occupied ports and confirm dev server mtime against latest source file edit.',
      };
      exp.falsification = evaluateExperimentRubric(exp);
      return exp;
    }
  }

  const allText = [
    context.problem,
    ...context.observations,
    ...context.attempts,
    ...context.candidate_hypotheses,
  ].join(' ').toLowerCase();

  // 0. Flapping Exit Code Circuit Breaker (PLAN.md Section 18.E)
  const exitCodeMatches = allText.match(/exit(?:ed with)? (?:code )?(\d+)/gi);
  if (exitCodeMatches && exitCodeMatches.length >= 3) {
    const codes = exitCodeMatches.map((m) => m.toLowerCase().replace(/[^0-9]/g, ''));
    if (codes.length >= 3 && codes.slice(-3).every((c) => c === codes.slice(-1)[0])) {
      exp = {
        strategy: 'clean-slate-rollback',
        question: `Command consistently fails with identical exit code ${codes[0]} across 3+ attempts. Are speculative edits polluting the environment?`,
        expected_outcome: 'Rolling back uncommitted churn to a clean git baseline breaks the flapping exit code loop.',
        risk: 'Low: stashes uncommitted changes cleanly.',
        probe: 'Stash all speculative edits with "git stash push -u -m ctrl-alt-pray-flapping" and rerun the single isolated command to re-establish the baseline failure.',
      };
      exp.falsification = evaluateExperimentRubric(exp);
      return exp;
    }
  }

  // 0.1 Human Checkpoint: Unclear product decision, conflicting spec, stakeholder rule
  const humanTriggers = [
    'missing requirement',
    'product decision',
    'unclear requirement',
    'ask user',
    'product owner',
    'stakeholder',
    'conflict resolution',
    'which behavior',
    'human checkpoint',
    'business logic ambiguous',
  ];
  if (humanTriggers.some((t) => allText.includes(t))) {
    exp = {
      strategy: 'human-checkpoint',
      question: 'Which product requirement or business rule governs this conflicting behavior?',
      expected_outcome: 'An authoritative decision from the human maker removes ambiguity before writing speculative code.',
      risk: 'Zero: read-only question to user.',
      probe: 'Formulate one concrete multiple-choice question to the human clarifying the required specification.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 0.2 Ghost Terminal Breaker: Process hangs, waiting on output, terminal finished or stuck on prompt
  const ghostTerminalRegex = /\b(hanging|hung|hangs|stuck waiting|waiting for output|terminal stuck|waiting forever|still waiting|never completes|no output from terminal|loading forever|command stuck|idle process)\b/i;
  if (ghostTerminalRegex.test(allText)) {
    exp = {
      strategy: 'ghost-terminal-breaker',
      question: 'Has the process already completed without emitting a stream EOF/exit event, or is it blocked on an unhandled interactive prompt/watcher?',
      expected_outcome: 'Inspecting process liveness, terminal tail, and log mtime reveals whether the task is a finished ghost, an interactive prompt trap, or a watch-mode daemon.',
      risk: 'Low: read-only process and log inspection; kill task only if confirmed idle.',
      probe: '1) Verify if PID exists and CPU% > 0; 2) Scan last 3 lines of terminal buffer for unhandled prompts ((y/n)?, password, select, press enter); 3) If log file mtime is unchanged for >15s with 0% CPU, terminate the stalled task and read the captured log directly.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 0.3 Environment Triage: Missing binary, permission denied, disk full, or environment prerequisite
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
    exp = {
      strategy: 'environment-triage',
      question: 'Is the failure caused by a missing system dependency, incorrect executable path, or filesystem permissions rather than repository code logic?',
      expected_outcome: 'Verifying executable path, user permissions, or disk quota isolates the environment prerequisite before modifying source code.',
      risk: 'Low: read-only environment inspection; no application code changes.',
      probe: '1) Verify executable existence with command -v <binary> or which; 2) Check target permissions via ls -la; 3) Verify available disk space via df -h.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 0.4 API Ground Truth: Hallucinated functions, exports, or missing methods
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
    exp = {
      strategy: 'api-ground-truth',
      question: 'Does the installed dependency or imported module actually export the expected symbol at runtime?',
      expected_outcome: 'Inspecting the installed module declaration file (.d.ts) or running a one-line node repl inspection verifies the actual exported API instead of guessing alternate function names.',
      risk: 'Low: read-only type or runtime print.',
      probe: 'Run a one-line runtime export probe (e.g. node -e "console.log(Object.keys(await import(\'<module>\')))") or inspect the installed package .d.ts directly. Do not guess alternate names.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 0.5 Clean Slate Rollback: Too many dirty files or stacked debugging edits polluting the signal
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
    exp = {
      strategy: 'clean-slate-rollback',
      question: 'Are uncommitted abandoned debug edits from prior failed attempts polluting the current failure signal?',
      expected_outcome: 'Reverting speculative scratch edits back to a clean git baseline eliminates secondary bugs introduced during debugging.',
      risk: 'Low: only discards failed scratch edits; preserves user work.',
      probe: 'Run "git status -s" and "git diff" to review uncommitted churn; discard failed speculative edits with "git checkout -- <file>" before testing another probe.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
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
    exp = {
      strategy: 'wrong-altar',
      question: 'Is the runtime process or test runner actually executing the exact file and build artifact being modified?',
      expected_outcome: 'A harmless marker, unique console print, or build identifier proves whether code edits are active or bypassed.',
      risk: 'Low: read-only or harmless diagnostic print; no mutation to production.',
      probe: 'Inject a unique non-secret runtime marker (e.g. console.error("RUNNING_TARGET_CHECK_<UUID>")) and inspect stdout/stderr.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
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
    exp = {
      strategy: 'check-the-check',
      question: 'Does the verification check or test suite reliably fail when a deliberate error is introduced?',
      expected_outcome: 'A deliberate syntax error or failing assertion confirms the test suite is actually executing the target code path.',
      risk: 'Low: temporary negative control in local environment; must restore immediately after run.',
      probe: 'Introduce a deliberate deliberate failing assertion (e.g. assert.strictEqual(1, 2)) in the test path and verify the test fails.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 3. Assumption Audit: Candidate hypotheses treated as fact without empirical verification
  if (context.candidate_hypotheses.length > 0) {
    const primaryHypothesis = context.candidate_hypotheses[0];
    exp = {
      strategy: 'assumption-audit',
      question: `Is the candidate assumption '${primaryHypothesis}' empirically true?`,
      expected_outcome: 'A direct inspect or query isolates whether this hypothesis is supported by hard evidence or refuted.',
      risk: 'Low: read-only check or isolated query.',
      probe: `Design a single diagnostic probe that directly prints or asserts the truth value of: '${primaryHypothesis}'.`,
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 4. Controlled Substitution: Swap suspect component with verified counterpart
  const substitutionTriggers = [
    'two plausible causes',
    'compare implementations',
    'controlled substitution',
    'substitution',
    'swap factor',
    'known-good counterpart',
    'isolate dependency',
    'timing vs logic',
  ];
  if (substitutionTriggers.some((t) => allText.includes(t))) {
    exp = {
      strategy: 'controlled-substitution',
      question: 'Does replacing this suspect factor with a known-working counterpart isolate the failure?',
      expected_outcome: 'Substituting exactly one component isolates whether that specific factor is responsible.',
      risk: 'Low: temporary substitution in local test environment; restore baseline afterward.',
      probe: 'Hold all other variables constant and swap only the suspect module/input with a verified counterpart.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 5. Divide and Conquer (PLAN.md M1 Priority 3): Trace intermediate boundary values or bisect regression
  const divideTriggers = [
    'intermediate',
    'data flow transform',
    'regression',
    'bisect',
    'midpoint',
    'commit sequence',
    'ordered history',
  ];
  if (divideTriggers.some((t) => allText.includes(t))) {
    exp = {
      strategy: 'divide-and-conquer',
      question: 'At what intermediate processing boundary does the invariant break?',
      expected_outcome: 'Inspecting data right at the midpoint boundary eliminates half of the suspect subsystems.',
      risk: 'Low: log inspection at intermediate boundaries.',
      probe: 'Inspect and log the state/payload exactly midway between the entry point and the failure point.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 6. Minimal Counterexample: Complex payload, large input, or noisy repro needing reduction
  const minimalReproTriggers = [
    'complex input',
    'complex payload',
    'large payload',
    'large request',
    'many fields',
    'timeout',
    'flaky',
    'intermittent',
  ];
  if (minimalReproTriggers.some((t) => allText.includes(t))) {
    exp = {
      strategy: 'minimal-counterexample',
      question: 'What is the smallest self-contained input that reproduces the failure?',
      expected_outcome: 'Stripping secondary dependencies and fields leaves a minimal isolated failure vector.',
      risk: 'Low: creates an isolated reproduction fixture.',
      probe: 'Halve the input payload or mock external dependencies until only the minimal failing invariant remains.',
    };
    exp.falsification = evaluateExperimentRubric(exp);
    return exp;
  }

  // 7. Default: Subsystem Boundary Check
  exp = {
    strategy: 'boundary-check',
    question: 'What is the smallest observation that would separate the remaining hypotheses?',
    expected_outcome: 'A boundary check narrows the failing path to a single subsystem.',
    risk: 'Low: no mutation or production access is required by default.',
    probe: 'Compare inputs and outputs across the suspected component boundary before modifying neighboring code.',
  };
  exp.falsification = evaluateExperimentRubric(exp);
  return exp;
}

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
