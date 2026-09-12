import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { TranscriptAdapter } from './types.js';

export class ClaudeCodeAdapter implements TranscriptAdapter {
  public readonly name = 'claude-code';

  public detect(workspaceDir: string): boolean {
    const localClaude = path.join(workspaceDir, '.claude');
    const localConfig = path.join(workspaceDir, 'CLAUDE.md');
    const globalClaude = path.join(os.homedir(), '.claude');
    return fs.existsSync(localClaude) || fs.existsSync(localConfig) || fs.existsSync(globalClaude);
  }

  public async harvest(workspaceDir: string): Promise<string[]> {
    const observations: string[] = [];
    try {
      const claudeMd = path.join(workspaceDir, 'CLAUDE.md');
      if (fs.existsSync(claudeMd)) {
        observations.push('Claude Code environment detected (CLAUDE.md present in workspace root).');
      }
    } catch {
      // Graceful degradation
    }
    return observations;
  }
}

export class CursorAdapter implements TranscriptAdapter {
  public readonly name = 'cursor';

  public detect(workspaceDir: string): boolean {
    const cursorDir = path.join(workspaceDir, '.cursor');
    const cursorRules = path.join(workspaceDir, '.cursorrules');
    return fs.existsSync(cursorDir) || fs.existsSync(cursorRules);
  }

  public async harvest(workspaceDir: string): Promise<string[]> {
    const observations: string[] = [];
    try {
      const rulesPath = path.join(workspaceDir, '.cursorrules');
      if (fs.existsSync(rulesPath)) {
        observations.push('Cursor IDE agent environment detected (.cursorrules present).');
      }
    } catch {
      // Graceful degradation
    }
    return observations;
  }
}

export class AiderAdapter implements TranscriptAdapter {
  public readonly name = 'aider';

  public detect(workspaceDir: string): boolean {
    const history = path.join(workspaceDir, '.aider.chat.history.md');
    const conf = path.join(workspaceDir, '.aider.conf.yml');
    return fs.existsSync(history) || fs.existsSync(conf);
  }

  public async harvest(workspaceDir: string): Promise<string[]> {
    const observations: string[] = [];
    try {
      const history = path.join(workspaceDir, '.aider.chat.history.md');
      if (fs.existsSync(history)) {
        const stats = fs.statSync(history);
        observations.push(`Aider session history detected (.aider.chat.history.md, size: ${stats.size} bytes).`);
      }
    } catch {
      // Graceful degradation
    }
    return observations;
  }
}

export class AntigravityAdapter implements TranscriptAdapter {
  public readonly name = 'antigravity';

  public detect(workspaceDir: string): boolean {
    const geminiMd = path.join(workspaceDir, 'GEMINI.md');
    const homeGemini = path.join(os.homedir(), '.gemini');
    return fs.existsSync(geminiMd) || fs.existsSync(homeGemini);
  }

  public async harvest(workspaceDir: string): Promise<string[]> {
    const observations: string[] = [];
    try {
      const geminiMd = path.join(workspaceDir, 'GEMINI.md');
      if (fs.existsSync(geminiMd)) {
        observations.push('Google Antigravity / Gemini CLI environment detected (GEMINI.md present).');
      }
    } catch {
      // Graceful degradation
    }
    return observations;
  }
}
