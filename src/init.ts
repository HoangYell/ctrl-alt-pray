import fs from 'node:fs';
import path from 'node:path';

export interface InitOptions {
  all?: boolean;
  editor?: string;
}

export interface InitResult {
  detected: string[];
  updatedFiles: string[];
  mcpConfigured: string[];
}

export const DEFAULT_MCP_CONFIG = {
  command: 'npx',
  args: ['-y', 'ctrl-alt-pray'],
};

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
 * Safely merges ctrl-alt-pray into an existing or new MCP configuration JSON file.
 * Preserves other configured MCP servers without overwriting.
 */
export function mergeMcpConfig(
  filePath: string,
  serverKey = 'ctrl-alt-pray',
  serverConfig = DEFAULT_MCP_CONFIG,
  isZed = false,
): { created: boolean; updated: boolean } {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let data: any = {};
  let created = false;

  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    } catch {
      data = {};
    }
  } else {
    created = true;
  }

  const rootKey = isZed ? 'context_servers' : 'mcpServers';
  if (!data[rootKey] || typeof data[rootKey] !== 'object' || Array.isArray(data[rootKey])) {
    data[rootKey] = {};
  }

  data[rootKey][serverKey] = serverConfig;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  return { created, updated: !created };
}

/**
 * Injects or appends the 2-strikes circuit breaker tripwire into an agent guideline file.
 */
export function injectTripwire(filePath: string): { created: boolean; updated: boolean } {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, TRIPWIRE_MARKDOWN + '\n', 'utf-8');
    return { created: true, updated: false };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('CTRL-ALT-PRAY TRIPWIRE')) {
    fs.writeFileSync(filePath, content.trimEnd() + '\n\n' + TRIPWIRE_MARKDOWN + '\n', 'utf-8');
    return { created: false, updated: true };
  }

  return { created: false, updated: false };
}

/**
 * One-Click MCP & Tripwire Setup for All Coding Editors:
 * Cursor, Claude Code, VS Code, Windsurf, Cline / Roo Code, Zed, JetBrains, Antigravity, OpenCode.
 */
export function runInit(
  targetDir: string = process.cwd(),
  printOutput = true,
  options: InitOptions = {},
): InitResult {
  const result: InitResult = {
    detected: [],
    updatedFiles: [],
    mcpConfigured: [],
  };

  const targetEditor = options.editor?.toLowerCase();
  const installAll = Boolean(options.all || targetEditor === 'all');

  // Helper to record file update
  const recordFile = (fileDesc: string, isMcp = false) => {
    if (isMcp) {
      if (!result.mcpConfigured.includes(fileDesc)) result.mcpConfigured.push(fileDesc);
    } else {
      if (!result.updatedFiles.includes(fileDesc)) result.updatedFiles.push(fileDesc);
    }
  };

  // 1. Cursor Setup
  const cursorRulesPath = path.join(targetDir, '.cursorrules');
  const cursorDir = path.join(targetDir, '.cursor');
  const cursorMcpPath = path.join(cursorDir, 'mcp.json');
  const vscodeMcpPath = path.join(targetDir, '.vscode', 'mcp.json');

  if (installAll || targetEditor === 'cursor' || fs.existsSync(cursorRulesPath) || fs.existsSync(cursorDir)) {
    result.detected.push('Cursor');
    const tw = injectTripwire(cursorRulesPath);
    if (tw.created) recordFile('.cursorrules (created)');
    else if (tw.updated) recordFile('.cursorrules (updated)');

    const mcp = mergeMcpConfig(cursorMcpPath);
    if (mcp.created) recordFile('.cursor/mcp.json (created)', true);
    else recordFile('.cursor/mcp.json (updated)', true);

    const vscMcp = mergeMcpConfig(vscodeMcpPath);
    if (vscMcp.created) recordFile('.vscode/mcp.json (created)', true);
  }

  // 2. Claude Code & Universal Root MCP Setup
  const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
  const claudeDir = path.join(targetDir, '.claude');
  const rootMcpPath = path.join(targetDir, '.mcp.json');

  if (installAll || targetEditor === 'claude' || targetEditor === 'claudecode' || fs.existsSync(claudeMdPath) || fs.existsSync(claudeDir)) {
    result.detected.push('Claude Code');
    const tw = injectTripwire(claudeMdPath);
    if (tw.created) recordFile('CLAUDE.md (created)');
    else if (tw.updated) recordFile('CLAUDE.md (updated)');

    const mcp = mergeMcpConfig(rootMcpPath);
    if (mcp.created) recordFile('.mcp.json (created)', true);
    else recordFile('.mcp.json (updated)', true);
  }

  // 3. VS Code / Copilot Agent Setup
  const vscodeDir = path.join(targetDir, '.vscode');
  if (installAll || targetEditor === 'vscode' || fs.existsSync(vscodeDir)) {
    if (!result.detected.includes('VS Code')) result.detected.push('VS Code');
    const mcp = mergeMcpConfig(vscodeMcpPath);
    if (mcp.created) recordFile('.vscode/mcp.json (created)', true);
    else recordFile('.vscode/mcp.json (updated)', true);
  }

  // 4. Windsurf (Codeium) Setup
  const windsurfRulesPath = path.join(targetDir, '.windsurfrules');
  const windsurfDir = path.join(targetDir, '.windsurf');
  const windsurfMcpPath = path.join(windsurfDir, 'mcp.json');

  if (installAll || targetEditor === 'windsurf' || fs.existsSync(windsurfRulesPath) || fs.existsSync(windsurfDir)) {
    result.detected.push('Windsurf');
    const tw = injectTripwire(windsurfRulesPath);
    if (tw.created) recordFile('.windsurfrules (created)');
    else if (tw.updated) recordFile('.windsurfrules (updated)');

    const mcp = mergeMcpConfig(windsurfMcpPath);
    if (mcp.created) recordFile('.windsurf/mcp.json (created)', true);
    else recordFile('.windsurf/mcp.json (updated)', true);
  }

  // 5. Cline / Roo Code Setup
  const clineRulesPath = path.join(targetDir, '.clinerules');
  const clineMcpPath = path.join(targetDir, 'cline_mcp_settings.json');

  if (installAll || targetEditor === 'cline' || targetEditor === 'roocode' || fs.existsSync(clineRulesPath) || fs.existsSync(clineMcpPath)) {
    result.detected.push('Cline / Roo Code');
    const tw = injectTripwire(clineRulesPath);
    if (tw.created) recordFile('.clinerules (created)');
    else if (tw.updated) recordFile('.clinerules (updated)');

    const mcp = mergeMcpConfig(clineMcpPath);
    if (mcp.created) recordFile('cline_mcp_settings.json (created)', true);
    else recordFile('cline_mcp_settings.json (updated)', true);
  }

  // 6. Zed Editor Setup
  const zedDir = path.join(targetDir, '.zed');
  const zedSettingsPath = path.join(zedDir, 'settings.json');

  if (installAll || targetEditor === 'zed' || fs.existsSync(zedDir)) {
    result.detected.push('Zed');
    const mcp = mergeMcpConfig(zedSettingsPath, 'ctrl-alt-pray', DEFAULT_MCP_CONFIG, true);
    if (mcp.created) recordFile('.zed/settings.json (created)', true);
    else recordFile('.zed/settings.json (updated)', true);
  }

  // 7. JetBrains AI / IntelliJ / WebStorm Setup
  const ideaDir = path.join(targetDir, '.idea');
  const ideaMcpPath = path.join(ideaDir, 'mcp.json');

  if (installAll || targetEditor === 'jetbrains' || targetEditor === 'idea' || fs.existsSync(ideaDir)) {
    result.detected.push('JetBrains AI');
    const mcp = mergeMcpConfig(ideaMcpPath);
    if (mcp.created) recordFile('.idea/mcp.json (created)', true);
    else recordFile('.idea/mcp.json (updated)', true);
  }

  // 8. Google Antigravity / Gemini CLI (GEMINI.md)
  const geminiMdPath = path.join(targetDir, 'GEMINI.md');
  if (installAll || targetEditor === 'gemini' || targetEditor === 'antigravity' || fs.existsSync(geminiMdPath)) {
    result.detected.push('Google Antigravity / Gemini');
    const tw = injectTripwire(geminiMdPath);
    if (tw.created) recordFile('GEMINI.md (created)');
    else if (tw.updated) recordFile('GEMINI.md (updated)');
  }

  // 9. OpenCode (opencode.jsonc or opencode.json)
  const opencodeJsonc = path.join(targetDir, 'opencode.jsonc');
  const opencodeJson = path.join(targetDir, 'opencode.json');
  const opencodePath = fs.existsSync(opencodeJsonc) ? opencodeJsonc : fs.existsSync(opencodeJson) ? opencodeJson : null;
  if (opencodePath) {
    result.detected.push('OpenCode');
    const mcp = mergeMcpConfig(rootMcpPath);
    if (mcp.created) recordFile('.mcp.json (created)', true);
  }

  // 10. Fallback / Universal Auto-Provision:
  // If no specific editor was matched, or if none was detected, arm universal root files
  if (result.detected.length === 0) {
    result.detected.push('Universal Agent Workspace');
    const agentsMd = path.join(targetDir, 'AGENTS.md');
    const tw = injectTripwire(agentsMd);
    if (tw.created) recordFile('AGENTS.md (created)');

    const rootMcp = mergeMcpConfig(rootMcpPath);
    if (rootMcp.created) recordFile('.mcp.json (created)', true);

    const vscMcp = mergeMcpConfig(vscodeMcpPath);
    if (vscMcp.created) recordFile('.vscode/mcp.json (created)', true);
  } else if (!installAll) {
    // Even in auto-detect mode, always ensure .mcp.json exists so standard MCP clients find it
    const rootMcp = mergeMcpConfig(rootMcpPath);
    if (rootMcp.created) recordFile('.mcp.json (created)', true);
  }

  if (printOutput) {
    console.log(`
      🕯️  THE ALTAR OF GROUND TRUTH HAS BEEN SUMMONED  🕯️
           [ ONE-CLICK MCP SETUP FOR CODING EDITORS ]

  ✔ Environments Configured : ${result.detected.join(', ')}
  ✔ MCP Configurations      : ${result.mcpConfigured.length > 0 ? result.mcpConfigured.join(', ') : 'Ready'}
  ✔ Tripwire Rule Files     : ${result.updatedFiles.length > 0 ? result.updatedFiles.join(', ') : 'Already active'}
  
  Your coding agents are armed with the 2-Strikes Circuit Breaker and MCP Altar.
  When an agent loops, hallucinates, or freezes, it will summon the Altar.
  May the RNG Gods bless your test runs. 🎲
`);
  }

  return result;
}
