#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

import {
  createRecoverySession,
  reportOutcome,
} from './recovery.js';

const server = new McpServer({
  name: 'ctrl-alt-pray',
  version: '0.1.0',
});

server.registerTool(
  'pray',
  {
    description: 'Start or resume a recovery session for a stuck debugging loop.',
    inputSchema: z.object({
      project_key: z.string(),
      request_id: z.string(),
      problem: z.string(),
      constraints: z.array(z.string()).default([]),
      observations: z.array(z.string()).default([]),
      attempts: z.array(z.string()).default([]),
      candidate_hypotheses: z.array(z.string()).default([]),
      capabilities: z.array(z.string()).default([]),
      budget: z.number().int().positive().default(3),
    }),
  },
  async (args) => {
    const result = createRecoverySession(args);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          session_id: result.session_id,
          revision: result.revision,
          assessment: result.assessment,
          next_action: result.next_action,
          experiment: result.experiment,
          handoff: result.handoff,
        }, null, 2),
      }],
    };
  },
);

server.registerTool(
  'report_outcome',
  {
    description: 'Record the result of the most recent experiment and update the next decision.',
    inputSchema: z.object({
      project_key: z.string(),
      session_id: z.string(),
      expected_revision: z.number().int().positive(),
      request_id: z.string(),
      experiment_id: z.string().optional(),
      outcome: z.enum(['supports', 'contradicts', 'inconclusive', 'blocked']),
      observations: z.array(z.string()).default([]),
      checks: z.array(z.object({
        name: z.string(),
        result: z.string(),
      })).default([]),
    }),
  },
  async (args) => {
    const result = reportOutcome(args);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          session_id: result.session_id,
          revision: result.revision,
          assessment: result.assessment,
          next_action: result.next_action,
          handoff: result.handoff,
          decision: result.next_action === 'ask_user' ? 'ask_user' : 'continue',
        }, null, 2),
      }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Ctrl Alt Pray failed to start:', error);
  process.exit(1);
});
