import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, afterAll, beforeAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.resolve(__dirname, '../dist/index.js');

class McpTestClient {
  private proc: ChildProcess;
  private buffer = '';
  private nextId = 1;
  private pending = new Map<number | string, (res: any) => void>();

  constructor() {
    this.proc = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CTRL_ALT_PRAY_DB_PATH: ':memory:' },
    });

    this.proc.stdout?.on('data', (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line.trim());
          if (msg.id && this.pending.has(msg.id)) {
            const resolver = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            resolver(msg);
          }
        } catch {
          // Ignore non-json lines
        }
      }
    });
  }

  public sendRequest(method: string, params: any = {}): Promise<any> {
    const id = this.nextId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.proc.stdin?.write(JSON.stringify(payload) + '\n');
    });
  }

  public close(): void {
    this.proc.kill('SIGTERM');
  }
}

describe('MCP Stdio Round-Trip (PLAN.md M2)', () => {
  let client: McpTestClient;

  beforeAll(async () => {
    client = new McpTestClient();
  });

  afterAll(() => {
    client.close();
  });

  it('initializes the MCP protocol with server capabilities', async () => {
    const initRes = await client.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'vitest-client', version: '1.0.0' },
    });

    expect(initRes.result).toBeDefined();
    expect(initRes.result.serverInfo.name).toBe('ctrl-alt-pray');
    expect(initRes.result.serverInfo.version).toBe('2.0.0');
    expect(initRes.result.capabilities.tools).toBeDefined();
    expect(initRes.result.capabilities.resources).toBeDefined();
    expect(initRes.result.capabilities.prompts).toBeDefined();
  });

  it('lists registered tools (pray, report_outcome, inspect_ledger)', async () => {
    const listRes = await client.sendRequest('tools/list');
    expect(listRes.result).toBeDefined();
    const toolNames = listRes.result.tools.map((t: any) => t.name);

    expect(toolNames).toContain('pray');
    expect(toolNames).toContain('report_outcome');
    expect(toolNames).toContain('inspect_ledger');
  });

  it('calls pray tool and receives a structured recovery card', async () => {
    const prayRes = await client.sendRequest('tools/call', {
      name: 'pray',
      arguments: {
        project_key: 'mcp-test-project',
        problem: 'Flaky test failure across 2 runs',
        observations: ['Test times out on network call'],
        attempts: ['Increased timeout', 'Retried command'],
        auto_harvest: false,
      },
    });

    expect(prayRes.result).toBeDefined();
    expect(prayRes.result.content[0].type).toBe('text');

    const card = JSON.parse(prayRes.result.content[0].text);
    expect(card.session_id).toBeDefined();
    expect(card.revision).toBe(1);
    expect(card.assessment).toBe('possible_loop');
    expect(card.next_action).toBe('experiment');
    expect(card.experiment).toBeDefined();
    expect(card.falsification).toBeDefined();
    expect(card.falsification.score).toBeGreaterThanOrEqual(60);

    // Now test report_outcome with this session
    const reportRes = await client.sendRequest('tools/call', {
      name: 'report_outcome',
      arguments: {
        project_key: 'mcp-test-project',
        session_id: card.session_id,
        expected_revision: 1,
        request_id: 'req-mcp-report-1',
        outcome: 'supports',
        observations: ['Network stub eliminates timeout'],
        checks: [{ name: 'stub-check', result: 'pass' }],
      },
    });

    const reportCard = JSON.parse(reportRes.result.content[0].text);
    expect(reportCard.revision).toBe(2);
    expect(reportCard.decision).toBe('continue');
    expect(reportCard.verification_status).toBe('verified_against_declared_checks');

    // Test inspect_ledger
    const inspectRes = await client.sendRequest('tools/call', {
      name: 'inspect_ledger',
      arguments: {
        project_key: 'mcp-test-project',
        session_id: card.session_id,
      },
    });

    const ledger = JSON.parse(inspectRes.result.content[0].text);
    expect(ledger.session_id).toBe(card.session_id);
    expect(ledger.revision).toBe(2);
  });

  it('lists and reads MCP resources', async () => {
    const resourcesRes = await client.sendRequest('resources/list');
    expect(resourcesRes.result).toBeDefined();
    const uris = resourcesRes.result.resources.map((r: any) => r.uri);
    expect(uris).toContain('sessions://active');

    const readRes = await client.sendRequest('resources/read', {
      uri: 'sessions://active',
    });
    expect(readRes.result).toBeDefined();
    expect(readRes.result.contents[0].text).toBeDefined();
  });

  it('lists and gets MCP prompts', async () => {
    const promptsRes = await client.sendRequest('prompts/list');
    expect(promptsRes.result).toBeDefined();
    const promptNames = promptsRes.result.prompts.map((p: any) => p.name);
    expect(promptNames).toContain('loop-recovery');
    expect(promptNames).toContain('falsification-check');

    const getRes = await client.sendRequest('prompts/get', {
      name: 'loop-recovery',
      arguments: { problem: 'Stuck compiling TypeScript' },
    });

    expect(getRes.result).toBeDefined();
    expect(getRes.result.messages[0].content.text).toContain('Stuck compiling TypeScript');
  });
});
