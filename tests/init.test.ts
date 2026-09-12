import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { runInit, TRIPWIRE_MARKDOWN } from '../src/init.js';

describe('runInit Universal Ignition', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrl-alt-pray-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Cursor and creates .cursorrules if missing', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const result = runInit(tmpDir, false);

    expect(result.detected).toContain('Cursor');
    const createdRules = path.join(tmpDir, '.cursorrules');
    expect(fs.existsSync(createdRules)).toBe(true);
    const content = fs.readFileSync(createdRules, 'utf-8');
    expect(content).toContain('CTRL-ALT-PRAY TRIPWIRE');
  });

  it('detects Claude Code and appends Tripwire to existing CLAUDE.md', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '# Existing Claude Guidelines\n\n- Build: pnpm build\n', 'utf-8');

    const result = runInit(tmpDir, false);
    expect(result.detected).toContain('Claude Code');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('# Existing Claude Guidelines');
    expect(content).toContain('CTRL-ALT-PRAY TRIPWIRE');
  });

  it('detects OpenCode and sets up .vscode/mcp.json if .vscode exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{\n  "name": "test"\n}\n', 'utf-8');
    fs.mkdirSync(path.join(tmpDir, '.vscode'));

    const result = runInit(tmpDir, false);
    expect(result.detected).toContain('OpenCode');
    expect(fs.existsSync(path.join(tmpDir, '.vscode', 'mcp.json'))).toBe(true);
    const mcpContent = JSON.parse(fs.readFileSync(path.join(tmpDir, '.vscode', 'mcp.json'), 'utf-8'));
    expect(mcpContent.mcpServers['ctrl-alt-pray']).toBeDefined();
  });

  it('falls back to creating AGENTS.md in a fresh workspace', () => {
    const result = runInit(tmpDir, false);
    expect(result.detected).toContain('Universal Agent Workspace');
    const agentsMd = path.join(tmpDir, 'AGENTS.md');
    expect(fs.existsSync(agentsMd)).toBe(true);
    expect(fs.readFileSync(agentsMd, 'utf-8')).toContain('CTRL-ALT-PRAY TRIPWIRE');
  });
});
