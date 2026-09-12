import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

import { harvestGitState } from '../src/harvester/git.js';
import { harvestSocketState, isPortOccupied } from '../src/harvester/socket.js';
import { harvestEvidence } from '../src/harvester/index.js';
import { createOrResumeRecoverySession } from '../src/recovery.js';

describe('Universal Harvester', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrl-alt-pray-harvest-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects git lockfile (.git/index.lock) correctly', () => {
    const gitDir = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDir);
    fs.writeFileSync(path.join(gitDir, 'index.lock'), 'locked');

    const result = harvestGitState(tmpDir);
    expect(result.isGitRepo).toBe(true);
    expect(result.isLocked).toBe(true);
  });

  it('probes socket ports and detects occupied ports using native node:net', async () => {
    const testServer = net.createServer();
    const testPort = 39871;

    await new Promise<void>((resolve) => {
      testServer.listen(testPort, '127.0.0.1', () => resolve());
    });

    try {
      const occupied = await isPortOccupied(testPort);
      expect(occupied).toBe(true);

      const free = await isPortOccupied(testPort + 1);
      expect(free).toBe(false);

      const result = await harvestSocketState([testPort, testPort + 1]);
      expect(result.occupiedPorts).toContain(testPort);
      expect(result.occupiedPorts).not.toContain(testPort + 1);
    } finally {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  });

  it('harvests evidence and synthesizes a recovery session without throwing', async () => {
    const evidence = await harvestEvidence(process.cwd());
    expect(evidence).toBeDefined();
    expect(evidence.git.isGitRepo).toBe(true);
    expect(Array.isArray(evidence.observations)).toBe(true);
  });

  it('supports zero-argument invocation of createOrResumeRecoverySession', () => {
    const session = createOrResumeRecoverySession({});
    expect(session).toBeDefined();
    expect(session.session_id).toBeDefined();
    expect(session.project_key).toBe('default');
    expect(session.revision).toBe(1);
    expect(session.experiment).toBeDefined();
    expect(session.rite).toBeDefined();
    expect(session.nhan_pham).toBeDefined();
  });

  it('runs pluggable adapters (test archaeology, cursor, claude) with graceful degradation (PLAN.md Section 14.B)', async () => {
    // Create mock archaeology and client files in tmpDir
    fs.mkdirSync(path.join(tmpDir, 'test-results'));
    fs.writeFileSync(path.join(tmpDir, '.cursorrules'), '# cursor rules');
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# claude commands');

    const evidence = await harvestEvidence(tmpDir);
    expect(evidence.observations.some((o) => o.includes('test-results'))).toBe(true);
    expect(evidence.observations.some((o) => o.includes('Cursor'))).toBe(true);
    expect(evidence.observations.some((o) => o.includes('Claude'))).toBe(true);
  });
});
