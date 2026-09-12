import fs from 'node:fs';
import path from 'node:path';

export interface InitResult {
  detected: string[];
  updatedFiles: string[];
  mcpConfigured: string[];
}

export const TRIPWIRE_MARKDOWN = `
<!-- START CTRL-ALT-PRAY TRIPWIRE -->
### 🛑 Anti-Doom-Loop Circuit Breaker (ctrl-alt-pray)
- **Strict 2-Failure Limit**: If ANY test, build, or command fails twice with the same or related error, STOP editing immediately.
- **No Blind Guessing**: DO NOT modify files a third time without new discriminating evidence.
- **Mandatory Action**: Call the MCP tool 'pray' immediately. It will analyze your recent failure, provide an immutable falsification experiment, and reset your hypothesis space.
- **Terminal Freeze**: If a terminal command hangs or outputs nothing for >15s, cancel it immediately and call 'pray' with strategy="ghost-terminal-breaker".
- **Rite of Truth**: Do not apologize. State the single falsifiable hypothesis and execute the probe.
<!-- END CTRL-ALT-PRAY TRIPWIRE -->
`.trim();

/**
  * Auto-detects coding agent environments (Cursor, Claude Code, OpenCode, Cline, Antigravity)
  * and injects the 2-strikes circuit breaker tripwire and MCP configuration.
  */
export function runInit(targetDir: string = process.cwd(), printOutput = true): InitResult {
  const result: InitResult = {
    detected: [],
    updatedFiles: [],
    mcpConfigured: [],
  };

  // 1. Cursor (.cursorrules or .cursor/)
  const cursorRulesPath = path.join(targetDir, '.cursorrules');
  const cursorDir = path.join(targetDir, '.cursor');
  if (fs.existsSync(cursorRulesPath) || fs.existsSync(cursorDir)) {
    result.detected.push('Cursor');
    if (!fs.existsSync(cursorRulesPath)) {
      fs.writeFileSync(cursorRulesPath, TRIPWIRE_MARKDOWN + '\n', 'utf-8');
      result.updatedFiles.push('.cursorrules (created)');
    } else {
      const content = fs.readFileSync(cursorRulesPath, 'utf-8');
      if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
        fs.writeFileSync(cursorRulesPath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
        result.updatedFiles.push('.cursorrules (updated)');
      }
    }
  }

  // 2. Claude Code (CLAUDE.md)
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const claudeDir = path.join(targetDir, '.claude');
  if (fs.existsSync(claudeMdPath) || fs.existsSync(claudeDir)) {
    result.detected.push('Claude Code');
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
        fs.writeFileSync(claudeMdPath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
        result.updatedFiles.push('CLAUDE.md (updated)');
      }
    } else {
      fs.writeFileSync(claudeMdPath, TRIPWIRE_MARKDOWN + '\n', 'utf-8');
      result.updatedFiles.push('CLAUDE.md (created)');
    }
  }

  // 3. Generic AGENTS.md / GEMINI.md
  const agentsMdPath = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsMdPath)) {
    result.detected.push('Agents Framework (AGENTS.md)');
    const content = fs.readFileSync(agentsMdPath, 'utf-8');
    if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
      fs.writeFileSync(agentsMdPath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
      result.updatedFiles.push('AGENTS.md (updated)');
    }
  }

  const geminiMdPath = path.join(targetDir, 'GEMINI.md');
  if (fs.existsSync(geminiMdPath)) {
    result.detected.push('Google Antigravity / Gemini (GEMINI.md)');
    const content = fs.readFileSync(geminiMdPath, 'utf-8');
    if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
      fs.writeFileSync(geminiMdPath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
      result.updatedFiles.push('GEMINI.md (updated)');
    }
  }

  // 4. Cline / Roo Code (.clinerules)
  const clineRulesPath = path.join(targetDir, '.clinerules');
  if (fs.existsSync(clineRulesPath)) {
    result.detected.push('Cline / Roo Code (.clinerules)');
    const content = fs.readFileSync(clineRulesPath, 'utf-8');
    if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
      fs.writeFileSync(clineRulesPath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
      result.updatedFiles.push('.clinerules (updated)');
    }
  }

  // 5. OpenCode (opencode.jsonc or opencode.json)
  const opencodeJsonc = path.join(targetDir, 'opencode.jsonc');
  const opencodeJson = path.join(targetDir, 'opencode.json');
  const opencodePath = fs.existsSync(opencodeJsonc) ? opencodeJsonc : fs.existsSync(opencodeJson) ? opencodeJson : null;
  if (opencodePath) {
    result.detected.push('OpenCode');
    try {
      const content = fs.readFileSync(opencodePath, 'utf-8');
      if (!content.includes('ctrl-alt-pray')) {
        result.mcpConfigured.push(`${path.basename(opencodePath)} (registration available)`);
      }
    } catch {}
  }

  // 6. VS Code / Cursor MCP (.vscode/mcp.json)
  const vscodeDir = path.join(targetDir, '.vscode');
  const vscodeMcp = path.join(vscodeDir, 'mcp.json');
  if (fs.existsSync(vscodeDir)) {
    if (!fs.existsSync(vscodeMcp)) {
      fs.writeFileSync(
        vscodeMcp,
        JSON.stringify(
          {
            mcpServers: {
              'ctrl-alt-pray': {
                command: 'npx',
                args: ['-y', 'ctrl-alt-pray'],
              },
            },
          },
          null,
          2,
        ) + '\n',
        'utf-8',
      );
      result.updatedFiles.push('.vscode/mcp.json (created)');
    }
  }

  // Fallback: If no recognized agent harness was found, create AGENTS.md
  if (result.detected.length === 0) {
    result.detected.push('Universal Agent Workspace');
    const targetFile = path.join(targetDir, 'AGENTS.md');
    fs.writeFileSync(targetFile, TRIPWIRE_MARKDOWN + '\n', 'utf-8');
    result.updatedFiles.push('AGENTS.md (created with Tripwire)');
  }

  if (printOutput) {
    console.log(`
      🕯️  THE ALTAR OF GROUND TRUTH HAS BEEN SUMMONED  🕯️
           [ PRAYERS ARE OPTIONAL. EVIDENCE IS REQUIRED. ]

  ✔ Environments Detected : ${result.detected.join(', ')}
  ✔ Tripwires Injected    : ${result.updatedFiles.length > 0 ? result.updatedFiles.join(', ') : 'Already active'}
  
  When an agent loops, hallucinates, or freezes, it will summon the Altar.
  May the RNG Gods bless your test runs. 🎲
`);
  }

  return result;
}
