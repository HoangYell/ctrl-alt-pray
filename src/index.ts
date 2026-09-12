#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import {
  createOrResumeRecoverySession,
  reportOutcome,
  inspectSession,
  listSessions,
} from './recovery.js';
import { runInit } from './init.js';
import { runStats } from './stats.js';
import { runHistory } from './history.js';
import { runPurge } from './purge.js';
import { harvestEvidence } from './harvester/index.js';
import { runGuardian } from './guardian.js';
import { runDashboard } from './dashboard.js';

export const server = new McpServer({
  name: 'ctrl-alt-pray',
  version: '2.0.0',
});

function getRecoveryHint(errorMessage: string): string {
  if (errorMessage.includes('STALE_REVISION')) {
    return 'Fetch the latest session revision via inspect_ledger or read_resource session://{id}, then retry with the matching expected_revision.';
  }
  if (errorMessage.includes('SESSION_NOT_FOUND')) {
    return 'Check the project_key and session_id. If this is a new debugging loop, omit session_id to start a fresh recovery session.';
  }
  if (errorMessage.includes('UNKNOWN_EXPERIMENT')) {
    return 'The experiment_id provided does not match the currently active experiment in this session. Inspect the ledger to see the active experiment.';
  }
  if (errorMessage.includes('INPUT_TOO_LARGE')) {
    return 'Reduce the request payload size below 64 KiB. Truncate long logs or inspect targeted stack traces.';
  }
  if (errorMessage.includes('OBSERVATION_TOO_LARGE')) {
    return 'Individual observation exceeds 8 KiB. Sanitize or summarize verbose terminal dumps.';
  }
  if (errorMessage.includes('ATTEMPTS_EXCEEDED')) {
    return 'Session exceeded 50 attempts. Purge the session or reset hypothesis space with clean-slate-rollback.';
  }
  return 'Review input parameters and retry with verified observations.';
}

// ---------------------------------------------------------------------------
// 1. Tools Contract (PLAN.md Section 5)
// ---------------------------------------------------------------------------

server.registerTool(
  'pray',
  {
    description: 'Summon the Altar of Ground Truth when standard debugging fails or repetitive loops occur. CALL THIS TOOL IMMEDIATELY WHEN: (1) A test or command fails 2+ times with similar errors; (2) An edited code change produced zero difference in output; (3) A terminal command or child process hangs/times out >15s; (4) You are guessing module exports or APIs; (5) You feel the urge to apologize for failed attempts. If auto_harvest is true (default), scans git status, lockfiles, and occupied ports automatically.',
    inputSchema: z.object({
      schema_version: z.number().int().default(1).describe('Contract schema version (default 1)'),
      project_key: z.string().default('default').describe('Unique project identifier (e.g. repo name or workspace key)'),
      request_id: z.string().optional().describe('Unique client-generated idempotency key for this request'),
      problem: z.string().optional().describe('Concise description of the stuck goal (optional if auto_harvest is true)'),
      auto_harvest: z.boolean().default(true).describe('Automatically scan git status, lockfiles, and occupied ports for ground-truth evidence'),
      session_id: z.string().optional().describe('Omit to start a new session; provide to resume an existing session'),
      expected_revision: z.number().int().positive().optional().describe('Required when resuming a session to prevent stale concurrent updates'),
      constraints: z.array(z.string()).default([]).describe('Non-negotiable invariants (e.g. cannot edit schema, cannot add dependencies)'),
      observations: z.array(z.string()).default([]).describe('Hard, verified facts observed so far (logs, test outputs, diffs)'),
      attempts: z.array(z.string()).default([]).describe('Approaches already attempted that failed to produce new evidence'),
      candidate_hypotheses: z.array(z.string()).default([]).describe('Plausible explanations of the root cause to test'),
      capabilities: z.array(z.string()).default([]).describe('Host tool capabilities available (e.g. bash, read_file, git)'),
      budget: z.number().int().positive().default(3).describe('Maximum remaining recovery rounds'),
    }),
  },
  async (args) => {
    try {
      let observations = [...(args.observations || [])];
      let problem = args.problem;
      let forced_strategy: any = undefined;

      if (args.auto_harvest !== false) {
        try {
          const evidence = await harvestEvidence();
          observations = Array.from(new Set([...observations, ...evidence.observations]));
          if (!problem || problem.trim().length === 0) {
            problem = evidence.synthesizedProblem;
          }
          if (evidence.suggestedStrategy && (!args.attempts || args.attempts.length === 0)) {
            forced_strategy = evidence.suggestedStrategy;
          }
        } catch {
          // Graceful fallback if harvester fails
        }
      }

      const result = createOrResumeRecoverySession({
        ...args,
        problem: problem || 'Execution loop or stall detected in current task.',
        observations,
        forced_strategy,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            schema_version: result.schema_version,
            session_id: result.session_id,
            revision: result.revision,
            assessment: result.assessment,
            pathology: result.pathology,
            pathology_rationale: result.pathology_rationale,
            falsification: result.falsification,
            next_action: result.next_action,
            decision: result.decision,
            experiment: result.experiment,
            known_facts: result.known_facts,
            assumptions_to_check: result.assumptions_to_check,
            rejected_approaches: result.rejected_approaches,
            avoid_repeating: result.avoid_repeating,
            handoff: result.handoff,
            verification_status: result.verification_status,
            rite: result.rite,
            incantation: result.incantation,
            nhan_pham: result.nhan_pham,
            altar_warning: result.altar_warning,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            error_code: error?.message?.split(':')[0] || 'RECOVERY_ERROR',
            message: error?.message || 'Unknown recovery error',
            recovery_hint: getRecoveryHint(error?.message || ''),
          }, null, 2),
        }],
      };
    }
  },
);

server.registerTool(
  'report_outcome',
  {
    description: 'Record the empirical result of an experiment and advance the recovery decision ledger.',
    inputSchema: z.object({
      schema_version: z.number().int().default(1).describe('Contract schema version (default 1)'),
      project_key: z.string().describe('Unique project identifier'),
      session_id: z.string().describe('Active recovery session ID'),
      expected_revision: z.number().int().positive().describe('Current session revision before this report'),
      request_id: z.string().describe('Unique idempotency key for this report'),
      experiment_id: z.string().optional().describe('ID of the experiment whose result is being reported'),
      outcome: z.enum(['supports', 'contradicts', 'inconclusive', 'blocked']).describe('Observed result relative to the experiment hypothesis'),
      observations: z.array(z.string()).default([]).describe('New verified facts collected during the experiment'),
      changes: z.array(z.string()).default([]).describe('Relevant code, input, environment, or assumption changes'),
      checks: z.array(z.object({
        name: z.string(),
        result: z.string(),
      })).default([]).describe('Verification checks run with observed results'),
      cost: z.object({
        duration_ms: z.number().optional(),
        tool_calls: z.number().optional(),
        tokens: z.number().optional(),
      }).optional().describe('Optional host-reported duration, tool calls, or token usage'),
    }),
  },
  async (args) => {
    try {
      const result = reportOutcome(args);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            schema_version: result.schema_version,
            session_id: result.session_id,
            revision: result.revision,
            assessment: result.assessment,
            decision: result.decision,
            next_action: result.next_action,
            progress_reason: result.progress_reason,
            verification_status: result.verification_status,
            experiment: result.experiment,
            falsification: result.falsification,
            known_facts: result.known_facts,
            rejected_approaches: result.rejected_approaches,
            avoid_repeating: result.avoid_repeating,
            handoff: result.handoff,
          }, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            error_code: error?.message?.split(':')[0] || 'REPORT_ERROR',
            message: error?.message || 'Unknown report outcome error',
            recovery_hint: getRecoveryHint(error?.message || ''),
          }, null, 2),
        }],
      };
    }
  },
);

server.registerTool(
  'inspect_ledger',
  {
    description: 'Read-only inspection of a recovery session ledger without mutating state or advancing revision.',
    inputSchema: z.object({
      project_key: z.string().describe('Project identifier'),
      session_id: z.string().describe('Session ID to inspect'),
    }),
  },
  async (args) => {
    try {
      const session = inspectSession(args.project_key, args.session_id);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(session, null, 2),
        }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify({
            error_code: 'SESSION_NOT_FOUND',
            message: error?.message || 'Session not found',
            recovery_hint: 'Verify the session_id or call pray to start a new recovery session.',
          }, null, 2),
        }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// 2. MCP Resources Protocol
// ---------------------------------------------------------------------------

server.registerResource(
  'active-sessions',
  'sessions://active',
  {
    mimeType: 'application/json',
    description: 'Lists all active recovery sessions currently tracked by Ctrl Alt Pray.',
  },
  async (uri) => {
    const sessions = listSessions();
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(sessions, null, 2),
      }],
    };
  },
);

server.registerResource(
  'session-detail',
  new ResourceTemplate('session://{session_id}', { list: undefined }),
  {
    mimeType: 'application/json',
    description: 'Detailed evidence ledger and audit trail for a specific recovery session.',
  },
  async (uri, { session_id }) => {
    const sessions = listSessions();
    const session = sessions.find((s) => s.session_id === session_id);
    if (!session) {
      throw new Error(`Session ${session_id} not found`);
    }
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(session, null, 2),
      }],
    };
  },
);

// ---------------------------------------------------------------------------
// 3. MCP Prompts Protocol
// ---------------------------------------------------------------------------

server.registerPrompt(
  'loop-recovery',
  {
    description: 'Pre-flight debrief template for an agent caught in a repetitive debugging loop.',
    argsSchema: z.object({
      problem: z.string().describe('The stuck goal and symptom'),
    }),
  },
  ({ problem }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I am caught in a repetitive debugging loop while solving: "${problem}".

Before writing any more code or re-running failed commands, execute the following protocol:
1. List 2-3 hard facts that have been directly observed (exit codes, logs, exact diffs).
2. List what assumptions I have been treating as true without empirical verification.
3. Call the 'pray' MCP tool with these observations and candidate hypotheses to receive a bounded falsification experiment.`,
        },
      },
    ],
  }),
);

server.registerPrompt(
  'falsification-check',
  {
    description: 'Constructs an assumption audit probe to disprove a hypothesis instead of confirming it.',
    argsSchema: z.object({
      assumption: z.string().describe('The hypothesis or assumption to test'),
    }),
  },
  ({ assumption }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Target assumption: "${assumption}".

Formulate the smallest, read-only or low-risk diagnostic probe that could conclusively DISPROVE this assumption.
What specific output or error signal would prove this assumption false?`,
        },
      },
    ],
  }),
);

// ---------------------------------------------------------------------------
// Server & CLI Runner
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  if (arg === 'init') {
    runInit();
    return;
  }

  if (arg === 'stats') {
    runStats();
    return;
  }

  if (arg === 'history') {
    runHistory(process.argv[3]);
    return;
  }

  if (arg === 'purge') {
    runPurge(process.argv[3], process.argv[4]);
    return;
  }

  if (arg === 'dashboard') {
    runDashboard();
    return;
  }

  if (arg === 'run') {
    const code = await runGuardian(process.argv.slice(3));
    process.exit(code);
  }

  if (arg === '--help' || arg === '-h') {
    console.log(`
      🕯️  CTRL ALT PRAY - THE ANTI-DOOM-LOOP ENGINE  🕯️
           "When Ctrl+Z isn't enough. Pray."

  Usage:
    ctrl-alt-pray [command]
    pray-run <command>

  Commands:
    init             Auto-detect agent environments (Cursor, Claude, OpenCode) & inject Tripwires
    stats            Display telemetry on intercepted loops, recovery rates, and tokens saved
    history [id]     The Confessional: replay the 3-step decision tree of a recovered loop
    purge [proj] [id]Administrative purge of sessions and expired cache (>7 days)
    dashboard        Launch local visual recovery dashboard on http://127.0.0.1:3900
    run <cmd>        Run a shell command under active freeze (>15s) and failure supervision
    (no args)        Start the MCP (Model Context Protocol) stdio server

  Options:
    -h, --help       Show this divine guidance
    -v, --version    Show version
`);
    return;
  }

  if (arg === '--version' || arg === '-v') {
    console.log('ctrl-alt-pray v2.0.0');
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start if executed directly as main script
const isMain = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts');
if (isMain) {
  main().catch((error) => {
    console.error('Ctrl Alt Pray failed to start:', error);
    process.exit(1);
  });
}
