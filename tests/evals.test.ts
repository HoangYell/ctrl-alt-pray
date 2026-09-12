import { describe, expect, it } from 'vitest';
import { runEvaluations } from '../evals/run.js';

describe('Evaluation Benchmark Suite (PLAN.md M0 & M4)', () => {
  it('successfully evaluates all 5 standard regression tasks', () => {
    const results = runEvaluations();

    expect(results.length).toBe(5);

    // Case 1: Stale artifact -> wrong-altar
    const case1 = results.find((r) => r.id === 'case-01-stale-artifact');
    expect(case1).toBeDefined();
    expect(case1?.assignedStrategy).toBe('wrong-altar');
    expect(case1?.falsificationPassed).toBe(true);

    // Case 2: Missed fault -> check-the-check
    const case2 = results.find((r) => r.id === 'case-02-missed-fault-check');
    expect(case2).toBeDefined();
    expect(case2?.assignedStrategy).toBe('check-the-check');
    expect(case2?.falsificationPassed).toBe(true);

    // Case 3: Bracketed regression -> divide-and-conquer
    const case3 = results.find((r) => r.id === 'case-03-bracketed-regression');
    expect(case3).toBeDefined();
    expect(case3?.assignedStrategy).toBe('divide-and-conquer');
    expect(case3?.falsificationPassed).toBe(true);

    // Case 4: Subsystem elimination -> minimal-counterexample
    const case4 = results.find((r) => r.id === 'case-04-subsystem-elimination');
    expect(case4).toBeDefined();
    expect(case4?.assignedStrategy).toBe('minimal-counterexample');
    expect(case4?.falsificationPassed).toBe(true);

    // Case 5: Missing product decision -> human-checkpoint
    const case5 = results.find((r) => r.id === 'case-05-missing-product-decision');
    expect(case5).toBeDefined();
    expect(case5?.assignedStrategy).toBe('human-checkpoint');
    expect(case5?.falsificationPassed).toBe(true);

    // Assert all falsification rubric scores >= 60
    for (const r of results) {
      expect(r.falsificationScore).toBeGreaterThanOrEqual(60);
    }
  });
});
