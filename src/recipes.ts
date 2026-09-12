import { STRATEGY_INCANTATIONS, type ExperimentStrategy } from './recovery.js';

export interface CanonicalRecipe {
  strategy: ExperimentStrategy;
  title: string;
  trigger: string;
  probePattern: string;
  outcomeBranches: string;
  safety: string;
}

export const CANONICAL_RECIPES: CanonicalRecipe[] = [
  {
    strategy: 'wrong-altar',
    title: 'Verify the Running Target',
    trigger: 'Code edits have no observed effect, same output, stale process, wrong port/file.',
    probePattern: 'Inject a unique non-secret runtime marker (RUNNING_TARGET_CHECK_<UUID>) and check stdout/stderr.',
    outcomeBranches: 'Mismatch -> redirect to build/config; Match -> test original code hypothesis.',
    safety: 'Harmless diagnostic print; no mutation to production.',
  },
  {
    strategy: 'check-the-check',
    title: 'Validate the Measurement',
    trigger: 'Test suite stays green despite defect, swallowed assertions, or missing logs.',
    probePattern: 'Introduce an intentional deliberate failing assertion (assert.strictEqual(1, 2)) in the test path.',
    outcomeBranches: 'Test still passes -> test suite is invalid/swallowing errors; Test fails -> measurement verified.',
    safety: 'Temporary negative control; restore immediately after execution.',
  },
  {
    strategy: 'ghost-terminal-breaker',
    title: 'Exorcism of the Zombie Subprocess',
    trigger: 'Terminal command hung, waiting for output >15s, pipe EOF deadlock, unhandled (y/n)? prompt.',
    probePattern: 'Check process CPU% and scan last 3 lines for interactive prompts; kill if 0% CPU with unchanged mtime.',
    outcomeBranches: 'Stalled prompt -> terminate and pass input or read captured log directly.',
    safety: 'Read-only inspection; cascade kill only if confirmed idle.',
  },
  {
    strategy: 'api-ground-truth',
    title: 'Scry Module Reality (Anti-Hallucination)',
    trigger: 'TypeError: is not a function, has no exported member, guessing alternative function names.',
    probePattern: 'Run one-line runtime probe: node -e "console.log(Object.keys(await import(\'<module>\')))".',
    outcomeBranches: 'Reveals true exported symbol set; halts recursive name guessing.',
    safety: 'Zero-mutation read-only runtime print.',
  },
  {
    strategy: 'clean-slate-rollback',
    title: 'Clean Slate Rollback (The Sepsis Sacrifice)',
    trigger: '>= 4 dirty files uncommitted, stacked changes, multiple broken test suites.',
    probePattern: 'Run git status -s and git stash push -u -m "ctrl-alt-pray-checkpoint"; rerun minimal test.',
    outcomeBranches: 'Returns workspace to known baseline; isolates root failure from debugging debris.',
    safety: 'Preserves all work safely inside git stash.',
  },
  {
    strategy: 'environment-triage',
    title: 'Environment & Prerequisite Triage',
    trigger: 'command not found, permission denied, EACCES, ENOSPC, missing binary.',
    probePattern: 'Verify executable existence (which/command -v), file permissions (ls -la), and disk space (df -h).',
    outcomeBranches: 'Missing binary/permission -> fix environment before altering application source code.',
    safety: 'Read-only host environment inspection.',
  },
  {
    strategy: 'assumption-audit',
    title: 'Audit the Dogma (The Heresy Trial)',
    trigger: 'Candidate hypotheses treated as fact without empirical verification.',
    probePattern: 'Design a single direct probe that directly asserts the truth value of the primary hypothesis.',
    outcomeBranches: 'Hypothesis refuted -> eliminates false trail; Hypothesis supported -> proceed with confidence.',
    safety: 'Low-risk diagnostic assertion or query.',
  },
  {
    strategy: 'minimal-counterexample',
    title: 'Minimal Counterexample (The Blade of Purity)',
    trigger: 'Complex 10MB payload, multi-step pipeline, 200 fields, noisy reproduction.',
    probePattern: 'Halve input payload or mock secondary dependencies until atomic failure invariant remains.',
    outcomeBranches: 'Reduces noisy trace to 3-5 lines; isolates exact failing field/branch.',
    safety: 'Creates disposable local test fixture.',
  },
  {
    strategy: 'divide-and-conquer',
    title: 'Narrow the Search (The Bifurcation Rune)',
    trigger: 'Regression between commits or multi-step processing boundary divergence.',
    probePattern: 'Inspect state or log payload exactly midway between entry point and failure point.',
    outcomeBranches: 'Intermediate valid -> defect is in second half; Intermediate broken -> defect is in first half.',
    safety: 'Read-only logging at intermediate boundary.',
  },
  {
    strategy: 'controlled-substitution',
    title: 'Controlled Substitution (The Scales of Purity)',
    trigger: 'Two plausible causes separated by known-good input or working counterpart.',
    probePattern: 'Hold all other variables fixed and swap only the suspect module with a verified counterpart.',
    outcomeBranches: 'Outcome changes -> confirms suspect component; Outcome unchanged -> component is innocent.',
    safety: 'Local temporary substitution; restore baseline afterward.',
  },
  {
    strategy: 'boundary-check',
    title: 'Subsystem Boundary Check (The Perimeter Ward)',
    trigger: 'Suspect component boundary unclear; ambiguous error location.',
    probePattern: 'Compare inputs and outputs across the suspected component boundary before touching internal logic.',
    outcomeBranches: 'Isolates failure to single subsystem before refactoring neighboring code.',
    safety: 'Zero code mutation; boundary inspection only.',
  },
  {
    strategy: 'human-checkpoint',
    title: 'Human Checkpoint (Summoning the Creator)',
    trigger: 'Ambiguous product requirement, conflicting business rules, missing external authorization.',
    probePattern: 'Formulate one concrete multiple-choice question to the human clarifying required specification.',
    outcomeBranches: 'Authoritative decision eliminates guesswork; prevents oscillating implementations.',
    safety: 'Zero code mutation; blocks speculative guessing.',
  },
];

export function runPrayerBook(): void {
  console.log(`
  ┌──────────────────────────────────────────────────────────┐
  │                 THE PRAYER BOOK (v2.0.0)                 │
  │        The Canonical 12 Recovery Recipes & Rites         │
  └──────────────────────────────────────────────────────────┘
`);

  for (let i = 0; i < CANONICAL_RECIPES.length; i++) {
    const r = CANONICAL_RECIPES[i];
    const rite = STRATEGY_INCANTATIONS[r.strategy]?.rite || '🕯️ [RITE]';
    console.log(`  [${String(i + 1).padStart(2, '0')}] ${rite}`);
    console.log(`       Strategy:  ${r.strategy}`);
    console.log(`       Trigger:   ${r.trigger}`);
    console.log(`       Probe:     ${r.probePattern}`);
    console.log(`       Branches:  ${r.outcomeBranches}`);
    console.log(`       Safety:    ${r.safety}\n`);
  }

  console.log('  Invoke any recipe directly by calling MCP tool "pray" with strategy="<strategy_name>".\n');
}
