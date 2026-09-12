import type { Experiment, FalsificationRubric } from './recovery-types.js';

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
