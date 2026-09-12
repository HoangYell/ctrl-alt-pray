import { describe, it, expect, vi } from 'vitest';
import {
  generateHeuristicSecondOpinion,
  generateSecondOpinion,
} from '../src/critique.js';
import type { RecoverySession } from '../src/recovery.js';

function createMockSession(strategy: any): RecoverySession {
  return {
    schema_version: 1,
    session_id: 'sess-critique-test',
    project_key: 'test-project',
    revision: 1,
    assessment: 'possible_loop',
    next_action: 'experiment',
    decision: 'continue',
    constraints: [],
    known_facts: ['Observed error 500'],
    assumptions_to_check: ['Assumption A'],
    rejected_approaches: ['Edit handler'],
    avoid_repeating: [],
    handoff: 'Test handoff context',
    experiment: {
      question: 'Is the target process running the edited file?',
      strategy,
      probe: 'Inject UUID log statement',
      expected_outcome: 'UUID appears in logs',
      risk: 'None',
    },
  };
}

describe("Second Opinion & Devil's Advocate Critique (PLAN.md Section 13)", () => {
  it('generates targeted heuristic critiques for wrong-altar strategy', () => {
    const session = createMockSession('wrong-altar');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('environment variables or bundler caching');
    expect(opinion.blind_spot_warning).toContain('NODE_ENV');
    expect(opinion.counter_experiment).toBeDefined();
  });

  it('generates targeted heuristic critiques for check-the-check strategy', () => {
    const session = createMockSession('check-the-check');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('isolated mock');
    expect(opinion.blind_spot_warning).toContain('uncalled mock');
  });

  it('generates targeted heuristic critiques for ghost-terminal-breaker strategy', () => {
    const session = createMockSession('ghost-terminal-breaker');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('network I/O');
  });

  it('generates targeted heuristic critiques for api-ground-truth strategy', () => {
    const session = createMockSession('api-ground-truth');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('Proxy');
    expect(opinion.blind_spot_warning).toContain('non-enumerable');
  });

  it('generates targeted heuristic critiques for clean-slate-rollback strategy', () => {
    const session = createMockSession('clean-slate-rollback');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('earlier commit');
  });

  it('generates deterministic fallback critique for unknown strategies', () => {
    const session = createMockSession('custom-unknown-strategy');
    const opinion = generateHeuristicSecondOpinion(session);

    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('deterministic');
    expect(opinion.blind_spot_warning).toContain('consistent results');
    expect(opinion.counter_experiment).toContain('flakiness');
  });

  it('falls back to heuristic critique when server lacks sampling capability', async () => {
    const session = createMockSession('wrong-altar');
    const mockServer: any = {
      server: {
        getClientCapabilities: () => ({}),
      },
    };

    const opinion = await generateSecondOpinion(session, mockServer);
    expect(opinion.source).toBe('heuristic_devil_advocate');
  });

  it('requests host LLM sampling critique when client supports sampling', async () => {
    const session = createMockSession('wrong-altar');
    const mockServer: any = {
      server: {
        getClientCapabilities: () => ({ sampling: {} }),
        createMessage: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Devil Advocate: Your probe will be swallowed if stdout is redirected to a file.',
            },
          ],
        }),
      },
    };

    const opinion = await generateSecondOpinion(session, mockServer);
    expect(opinion.source).toBe('sampling');
    expect(opinion.critique).toContain('stdout is redirected');
    expect(mockServer.server.createMessage).toHaveBeenCalled();
  });

  it('gracefully degrades to heuristic critique if sampling request fails', async () => {
    const session = createMockSession('wrong-altar');
    const mockServer: any = {
      server: {
        getClientCapabilities: () => ({ sampling: {} }),
        createMessage: vi.fn().mockRejectedValue(new Error('Sampling rejected by client')),
      },
    };

    const opinion = await generateSecondOpinion(session, mockServer);
    expect(opinion.source).toBe('heuristic_devil_advocate');
    expect(opinion.critique).toContain('environment variables');
  });
});
