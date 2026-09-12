import type { Experiment, ExperimentStrategy, PathologyType, TheOffering } from './recovery-types.js';
import { evaluateExperimentRubric } from './recovery-rubric.js';

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
