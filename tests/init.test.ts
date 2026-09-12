import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { runInit, mergeMcpConfig, TRIPWIRE_MARKDOWN } from '../src/init.js';

describe('runInit Universal Ignition & One-Click MCP', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrl-alt-pray-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Cursor and creates .cursorrules and .cursor/mcp.json if missing', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const result = runInit(tmpDir, false);

    expect(result.detected).toContain('Cursor');
    const createdRules = path.join(tmpDir, '.cursorrules');
    expect(fs.existsSync(createdRules)).toBe(true);
    const content = fs.readFileSync(createdRules, 'utf-8');
    expect(content).toContain('CTRL-ALT-PRAY TRIPWIRE');

    const cursorMcp = path.join(tmpDir, '.cursor', 'mcp.json');
    expect(fs.existsSync(cursorMcp)).toBe(true);
    const mcpData = JSON.parse(fs.readFileSync(cursorMcp, 'utf-8'));
    expect(mcpData.mcpServers['ctrl-alt-pray']).toBeDefined();
  });

  it('detects Claude Code and appends Tripwire to existing CLAUDE.md and provisions .mcp.json', () => {
    const claudeMd = path.join(tmpDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMd, '# Existing Claude Guidelines\n\n- Build: pnpm build\n', 'utf-8');

    const result = runInit(tmpDir, false);
    expect(result.detected).toContain('Claude Code');
    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('# Existing Claude Guidelines');
    expect(content).toContain('CTRL-ALT-PRAY TRIPWIRE');

    const rootMcp = path.join(tmpDir, '.mcp.json');
    expect(fs.existsSync(rootMcp)).toBe(true);
    const mcpData = JSON.parse(fs.readFileSync(rootMcp, 'utf-8'));
    expect(mcpData.mcpServers['ctrl-alt-pray']).toBeDefined();
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

  it('falls back to creating AGENTS.md and .mcp.json in a fresh workspace', () => {
    const result = runInit(tmpDir, false);
    expect(result.detected).toContain('Universal Agent Workspace');
    const agentsMd = path.join(tmpDir, 'AGENTS.md');
    expect(fs.existsSync(agentsMd)).toBe(true);
    expect(fs.readFileSync(agentsMd, 'utf-8')).toContain('CTRL-ALT-PRAY TRIPWIRE');
    expect(fs.existsSync(path.join(tmpDir, '.mcp.json'))).toBe(true);
  });

  it('provisions all editors in one click with options.all = true', () => {
    const result = runInit(tmpDir, false, { all: true });

    expect(result.detected).toContain('Cursor');
    expect(result.detected).toContain('Claude Code');
    expect(result.detected).toContain('VS Code');
    expect(result.detected).toContain('Windsurf');
    expect(result.detected).toContain('Cline / Roo Code');
    expect(result.detected).toContain('Zed');
    expect(result.detected).toContain('JetBrains AI');
    expect(result.detected).toContain('Google Antigravity / Gemini');

    // Verify all key files exist
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.cursor', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.vscode', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.windsurfrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.windsurf', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.clinerules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'cline_mcp_settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.zed', 'settings.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.idea', 'mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'GEMINI.md'))).toBe(true);

    // Verify Zed context_servers schema
    const zedSettings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.zed', 'settings.json'), 'utf-8'));
    expect(zedSettings.context_servers['ctrl-alt-pray']).toBeDefined();
  });

  it('provisions single specific editor (e.g. windsurf)', () => {
    const result = runInit(tmpDir, false, { editor: 'windsurf' });
    expect(result.detected).toContain('Windsurf');
    expect(fs.existsSync(path.join(tmpDir, '.windsurfrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.windsurf', 'mcp.json'))).toBe(true);
    // Should NOT create Zed or JetBrains
    expect(fs.existsSync(path.join(tmpDir, '.zed', 'settings.json'))).toBe(false);
  });

  it('preserves existing MCP servers when merging config', () => {
    const configPath = path.join(tmpDir, 'custom-mcp.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          existingServer: {
            command: 'node',
            args: ['server.js'],
          },
        },
      }),
      'utf-8',
    );

    mergeMcpConfig(configPath);
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(parsed.mcpServers.existingServer).toBeDefined();
    expect(parsed.mcpServers['ctrl-alt-pray']).toBeDefined();
  });
});
