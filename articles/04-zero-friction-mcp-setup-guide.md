# Arming Cursor, Claude Code, and Windsurf: The 10-Second MCP Safety Net Guide

> **"Setting up a production-grade circuit breaker for your AI coding agents should take fewer seconds than reading a single hallucinated apology."**

---

## Why You Need a Hardware-Grade Circuit Breaker for AI

Whether you code inside **Cursor**, run autonomous agents via **Claude Code**, build with **Windsurf**, or pair with **Cline / Roo Code**, your AI assistant operates with write permissions to your filesystem and shell execution privileges.

Without an external safety net, a single misunderstood prompt can result in:
- Hundreds of lines of dead code injected across unrelated files.
- Hanging background test processes locking socket ports.
- Context window exhaustion costing $10 - $30 in a single runaway session.

**[ctrl-alt-pray](https://github.com/HoangYell/ctrl-alt-pray)** is an open-source, local-first Model Context Protocol (MCP) server that acts as an automated circuit breaker. 

Here is how to set it up across every major editor in under 10 seconds.

---

## Option 1: Universal 1-Click Direct Install (Fastest)

If your editor supports deep-link URL handlers, click one of the buttons below to install immediately without typing a single terminal command:

<div align="center">

| Editor | Direct 1-Click Action | Target Config |
| :--- | :--- | :--- |
| **Cursor** | **[⚡ Click to Install in Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=ctrl-alt-pray&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImN0cmwtYWx0LXByYXkiXX0%3D)** | `.cursor/mcp.json` |
| **VS Code / Copilot** | **[⚡ Click to Install in VS Code](https://vscode.dev/redirect/mcp/install?name=ctrl-alt-pray&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22ctrl-alt-pray%22%5D%7D)** | `.vscode/mcp.json` |
| **Web Configurator** | **[🌐 Launch Interactive Web Configurator](https://ctrl-alt-pray.pages.dev/#mcp-setup)** | Download ready-made `.json` |

</div>

---

## Option 2: CLI Auto-Ignition (`npx ctrl-alt-pray init`)

For any repository on your machine, open your terminal and run:

```bash
npx ctrl-alt-pray init
```

The auto-detection engine inspects your current directory, detects your active editor configurations, and injects both the **MCP server registration** and the **2-Strikes Circuit Breaker rules**:

```
  ┌──────────────────────────────────────────────────────────┐
  │                   CTRL ALT PRAY INITIALIZER              │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  ✓ Detected Cursor workspace (.cursor/ found)
  ✓ Created .cursor/mcp.json with ctrl-alt-pray stdio configuration
  ✓ Injected 2-Strikes Circuit Breaker into .cursorrules
  ✓ Verified Node.js runtime (v22.12.0)
  ✓ Altar ignited successfully!
```

### Provisioning All Editors Simultaneously
If you work across multiple editors (e.g. Cursor for frontend, Claude Code in terminal, and VS Code for review):

```bash
npx ctrl-alt-pray init --all
```
This provisions `.cursor/`, `.vscode/`, `.windsurf/`, `.zed/`, `CLAUDE.md`, `GEMINI.md`, and `cline_mcp_settings.json` in a single execution.

---

## What Gets Injected: The Anatomy of the Tripwire

Running `init` writes a non-negotiable behavioral contract into your workspace instructions:

```markdown
<!-- START CTRL-ALT-PRAY TRIPWIRE -->
### 🛑 Anti-Doom-Loop Circuit Breaker (ctrl-alt-pray)
1. STRICT 2-FAILURE LIMIT: If ANY test, build, or command fails twice with the same error, STOP editing immediately.
2. NO BLIND GUESSING: Do not touch application code a 3rd time without verified new evidence.
3. MANDATORY ACTION: Invoke MCP tool 'pray'. It will freeze speculative edits and prescribe ONE bounded falsification experiment.
4. TERMINAL FREEZE: If a command hangs >15s with zero output, kill it and invoke 'pray' (strategy="ghost-terminal-breaker").
5. ZERO APOLOGIES: Do not apologize. State your single testable hypothesis and execute the probe.
<!-- END CTRL-ALT-PRAY TRIPWIRE -->
```

Because this rule is positioned at the top of the context window and supported by the MCP schema description, the agent cannot bypass it when under pressure.

---

## Manual Configuration (For Power Users)

If you prefer editing JSON configuration files manually:

### 1. Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "ctrl-alt-pray": {
      "command": "npx",
      "args": ["-y", "ctrl-alt-pray"]
    }
  }
}
```

### 2. Claude Code (`~/.claude.json` or `.mcp.json`)
```json
{
  "mcpServers": {
    "ctrl-alt-pray": {
      "command": "npx",
      "args": ["-y", "ctrl-alt-pray"]
    }
  }
}
```

### 3. Google Antigravity / Gemini CLI (`mcp_config.json`)
```json
{
  "mcpServers": {
    "ctrl-alt-pray": {
      "command": "npx",
      "args": ["-y", "ctrl-alt-pray"]
    }
  }
}
```

---

## Verifying Your Installation

### 1. Inspect the Local Dashboard
Launch the Apple/Linear minimalist recovery ledger with one command:
```bash
ctrl-alt-pray dashboard
```
Open `http://127.0.0.1:3900` in your browser. You will see a live visual overview of intercepted doom loops, recovery success rates, and token savings.

### 2. Check Terminal Telemetry
Run:
```bash
pray stats
```
Output:
```text
  Active Sessions Recorded:  23
  Loops Intercepted:         20
  Loop Recovery Rate:        87.0%
  Estimated Tokens Saved:    ~195,500 tokens (~$2.93)
```

---

## Security & Privacy: Why Teams Trust It

- **100% Local**: All session records and telemetry reside in your local SQLite database (`~/.ctrl-alt-pray/sessions.sqlite`). No cloud sync, no tracking, no external API telemetry.
- **Automatic Secret Scrubbing**: All logs and diffs are automatically scrubbed for sensitive credentials (`ghp_`, `sk-`, `AKIA...`, `Bearer`) before touching disk.
- **Zero Runtime Dependencies**: Built strictly on top of Node 22 native modules (`node:sqlite`, `node:child_process`, `node:net`). No native C++ compilation or package bloat.

---

## Ready to Arm Your Workspace?

Stop watching your AI agent apologize in a 3:00 AM loop. Install the circuit breaker in 10 seconds:

```bash
npx ctrl-alt-pray init
```

⭐ Star the repository on **[GitHub](https://github.com/HoangYell/ctrl-alt-pray)**  
🌐 Explore the live simulator at **[ctrl-alt-pray.pages.dev](https://ctrl-alt-pray.pages.dev)**
