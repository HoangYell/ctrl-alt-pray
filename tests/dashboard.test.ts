import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateDashboardHtml, exportDashboardFile } from '../src/dashboard.js';
import { RecoveryStorage } from '../src/storage.js';
import type { RecoverySession } from '../src/recovery.js';

describe('Visual Dashboard (pray dashboard)', () => {
  const mockSessions: RecoverySession[] = [
    {
      session_id: 'test-dash-1',
      project_key: 'my-project',
      revision: 2,
      assessment: 'possible_loop',
      next_action: 'experiment',
      decision: 'continue',
      constraints: ['no schema edit'],
      known_facts: ['test failed on line 52'],
      assumptions_to_check: ['database port conflict'],
      rejected_approaches: ['re-running vitest'],
      avoid_repeating: ['re-running vitest'],
      handoff: 'Goal: fix test. Strategy: wrong-altar.',
      rite: '🏛️ [EXPOSING THE FALSE IDOL]',
      incantation: 'You pray at a frozen shrine.',
      updated_at: Date.now(),
      experiment: {
        strategy: 'wrong-altar',
        question: 'Is the test hitting stale artifacts?',
        expected_outcome: 'Build timestamp matches code.',
        risk: 'Low',
        probe: 'Verify dev port mtime.',
      },
    },
  ];

  it('generates well-formed HTML with valid tag pairings', () => {
    const html = generateDashboardHtml(mockSessions);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('test-dash-1');
    expect(html).toContain('wrong-altar');
    expect(html).toContain('EXPOSING THE FALSE IDOL');
  });

  it('handles empty sessions gracefully without crashing', () => {
    const html = generateDashboardHtml([]);
    expect(html).toContain('No sessions recorded yet');
    expect(html).toContain('</html>');
  });

  it('exports offline dashboard file to filesystem', () => {
    const memStorage = new RecoveryStorage({ inMemory: true });
    memStorage.saveSession(mockSessions[0]);
    const tmpFile = path.join(os.tmpdir(), `test-dash-${Date.now()}.html`);
    try {
      const filePath = exportDashboardFile(memStorage, tmpFile);
      expect(filePath).toBe(tmpFile);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('test-dash-1');
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });
});
