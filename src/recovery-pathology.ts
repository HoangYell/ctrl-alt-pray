import type { FileFlappingStatus, HeresyChallenge, PathologyType } from './recovery-types.js';

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
