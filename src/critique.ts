import type { McpServer } from '@modelcontextprotocol/server';
import type { RecoverySession } from './recovery.js';

export interface SecondOpinion {
  source: 'sampling' | 'heuristic_devil_advocate';
  critique: string;
  blind_spot_warning: string;
  counter_experiment?: string;
}

/**
 * Deterministic Heuristic Devil's Advocate generator (PLAN.md Section 13).
 * Fast, 0-cost, 0-token adversarial critique challenging the chosen experiment.
 */
export function generateHeuristicSecondOpinion(session: RecoverySession): SecondOpinion {
  const strategy = session.experiment?.strategy || '';

  switch (strategy) {
    case 'wrong-altar':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'You assume the file/port target is wrong, but environment variables or bundler caching might be overriding the runtime configuration silently.',
        blind_spot_warning: 'Check NODE_ENV, .env overrides, or tsconfig path aliases before assuming the file itself is not running.',
        counter_experiment: 'Print process.env and module resolution paths directly from the active entrypoint.',
      };

    case 'check-the-check':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'The test harness might be asserting against an isolated mock rather than the real implementation, giving a false sense of failure or passing.',
        blind_spot_warning: 'Ensure your intentional failing assertion is inside the real code path, not inside an uncalled mock or deferred promise.',
        counter_experiment: 'Add a deliberate throw at the top-level of the target function to verify invocation.',
      };

    case 'ghost-terminal-breaker':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'The process may not be deadlocked on standard input; it could be blocked on unhandled network I/O, DNS resolution, or an unclosed database handle.',
        blind_spot_warning: 'Killing the process without checking network connections may cause repeated timeouts on retry.',
        counter_experiment: 'Check open file descriptors or active socket connections before terminating.',
      };

    case 'api-ground-truth':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'The target module might be using dynamic Proxy handlers or TypeScript type-only definitions that do not exist at runtime.',
        blind_spot_warning: 'Object.keys() returns empty for non-enumerable prototype methods and Symbols.',
        counter_experiment: 'Log Object.getOwnPropertyNames(Object.getPrototypeOf(target)) to inspect class prototype methods.',
      };

    case 'clean-slate-rollback':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'Rolling back uncommitted files will not fix the issue if the defect was introduced in an earlier commit or corrupted node_modules.',
        blind_spot_warning: 'Do not assume clean git status implies clean build artifacts.',
        counter_experiment: 'Run git diff HEAD~1 to check recent committed changes or verify node_modules integrity.',
      };

    case 'minimal-counterexample':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'The defect might be an emergent interaction between multiple input fields rather than an isolated single field.',
        blind_spot_warning: 'If halving the input completely clears the error, the bug may be a multi-variable combination.',
        counter_experiment: 'Test pair-wise input combinations rather than strictly single isolated fields.',
      };

    case 'environment-triage':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'The command failure might not be a missing binary, but a path resolution difference inside subshells or containerized runners.',
        blind_spot_warning: 'Interactive shells often load different PATH variables than non-interactive exec environments.',
        counter_experiment: 'Run node -e "console.log(process.env.PATH)" directly in the failing environment.',
      };

    case 'divide-and-conquer':
      return {
        source: 'heuristic_devil_advocate',
        critique: 'Bifurcating the execution pipeline assumes linear control flow. Event listeners, background promises, or middleware hooks violate this.',
        blind_spot_warning: 'State may be mutated asynchronously outside the linear call stack.',
        counter_experiment: 'Trace async execution contexts or intercept lifecycle hooks.',
      };

    default:
      return {
        source: 'heuristic_devil_advocate',
        critique: 'You are assuming the defect is deterministic and reproducible under fixed conditions. Timing jitter, race conditions, or shared memory could be responsible.',
        blind_spot_warning: 'Verify if running the test in isolation with 5 repetitions yields consistent results before refactoring.',
        counter_experiment: 'Run the exact minimal test 5 times consecutively to test for non-deterministic flakiness.',
      };
  }
}

/**
 * Generates an adversarial second opinion on the proposed experiment (PLAN.md Section 13).
 * Uses MCP sampling/createMessage if client supports it; otherwise falls back to Heuristic Devil's Advocate.
 */
export async function generateSecondOpinion(
  session: RecoverySession,
  server?: McpServer
): Promise<SecondOpinion> {
  const clientCapabilities = (server?.server as any)?.getClientCapabilities?.();
  const supportsSampling = Boolean(clientCapabilities?.sampling);

  if (!supportsSampling || !server) {
    return generateHeuristicSecondOpinion(session);
  }

  try {
    const promptText = [
      "You are an adversarial debugging expert acting as Devil's Advocate.",
      `Context: The coding agent is stuck. Handoff: "${session.handoff}".`,
      `Proposed experiment: "${session.experiment?.question || 'Unknown'}" using probe: "${session.experiment?.probe || 'Unknown'}".`,
      "State one critical blind spot or hidden assumption this experiment fails to test. Under 80 words.",
    ].join('\n');

    const samplingPromise = (server.server as any).createMessage({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: promptText,
          },
        },
      ],
      maxTokens: 150,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sampling timeout')), 4000)
    );

    const result: any = await Promise.race([samplingPromise, timeoutPromise]);

    let textContent = '';
    if (result && Array.isArray(result.content)) {
      textContent = result.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(' ')
        .trim();
    } else if (typeof result?.content?.text === 'string') {
      textContent = result.content.text.trim();
    }

    if (textContent.length > 0) {
      return {
        source: 'sampling',
        critique: textContent,
        blind_spot_warning: "Generated via host LLM sampling (Devil's Advocate critique).",
      };
    }
  } catch {
    // Graceful fallback on timeout or sampling failure
  }

  return generateHeuristicSecondOpinion(session);
}
