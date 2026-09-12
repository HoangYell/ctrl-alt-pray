# 🕯️ Ctrl Alt Pray

> **When Ctrl+Z isn't enough. Pray.**  
> *The Anti-Doom-Loop Circuit Breaker & Epistemic Altar for Autonomous AI Coding Agents.*

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-21%2F21%20pass-brightgreen.svg)](tests/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Runtime](https://img.shields.io/badge/node-%E2%89%A522.12.0-orange.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-2026%20Ready-purple.svg)](https://modelcontextprotocol.io)

```text
       🕯️  THE ALTAR OF GROUND TRUTH HAS BEEN SUMMONED  🕯️
            [ PRAYERS ARE OPTIONAL. EVIDENCE IS REQUIRED. ]
```

---

## 💀 The Problem: The 3:00 AM Doom Loop

Every developer using autonomous AI agents (**Cursor Agent Mode**, **Claude Code**, **Cline**, **Antigravity**, **OpenCode**) has suffered through this:

1. The agent modifies line 42.
2. The test fails.
3. The agent apologizes profusely: *"I deeply apologize for the confusion! Let me fix that right away!"*
4. The agent modifies line 42 back with a minor cosmetic change.
5. The test fails again.
6. The terminal hangs for 10 minutes because a background subprocess swallowed EOF.
7. You wake up to a failed task and a **$35 API bill** burned on circular edits.

By turn 3 of a loop, **LLMs suffer from severe confirmation bias and context pollution**. Trying harder with the same assumptions has a $<5\%$ success rate.

**Ctrl Alt Pray** is the missing circuit breaker: it halts unconstrained guessing, clears toxic dirty edits, exorcises hanging terminals, and forces the agent to execute **one bounded, discriminating falsification experiment**.

---

## ⚡ Quick Start: 3-Second Universal Ignition

No manual configuration. Run this in any repository root:

```bash
npx ctrl-alt-pray init
```

`ctrl-alt-pray init` automatically detects your coding environment and arms the circuit breaker:
- **Cursor**: Creates/updates `.cursorrules` with the 2-Strikes Tripwire and generates `.vscode/mcp.json`.
- **Claude Code**: Creates/updates `CLAUDE.md` with non-negotiable loop-recovery rules.
- **OpenCode**: Detects `opencode.jsonc`.
- **Cline / Roo Code**: Injects into `.clinerules`.
- **Antigravity / Gemini CLI**: Injects into `GEMINI.md`.

---

## 🛑 The Injected 2-Strikes Circuit Breaker

```markdown
<!-- START CTRL-ALT-PRAY TRIPWIRE -->
### 🛑 Anti-Doom-Loop Circuit Breaker (ctrl-alt-pray)
- **Strict 2-Failure Limit**: If ANY test, build, or command fails twice with the same or related error, STOP editing immediately.
- **No Blind Guessing**: DO NOT modify files a third time without new discriminating evidence.
- **Mandatory Action**: Call the MCP tool 'pray' immediately. It will analyze your recent failure, provide an immutable falsification experiment, and reset your hypothesis space.
- **Terminal Freeze**: If a terminal command hangs or outputs nothing for >15s, cancel it immediately and call 'pray' with strategy="ghost-terminal-breaker".
- **Rite of Truth**: Do not apologize. State the single falsifiable hypothesis and execute the probe.
<!-- END CTRL-ALT-PRAY TRIPWIRE -->
```

---

## 🧙‍♂️ Occult Easter Eggs: Inside Agent `<thinking>` Traces

When your AI Agent invokes `pray`, the MCP returns subtle occult incantations and "Nhân Phẩm" (RNG Karma) rolls. If you inspect your agent's reasoning trace, you will catch it casting spells to escape its loop:

```text
Thinking Process:
- Test failed 3 times consecutively. Conventional debugging has failed.
- Invoking the ultimate rite: summoning the Altar via ctrl-alt-pray...
- [EXORCISM OF THE ZOMBIE]: Banish the mute terminal. Sever the orphaned child tree of PID 42105.
- Nhân Phẩm Roll: 94/100 (Thượng Thượng Phẩm - Divine Favor).
- The Altar demands: "Stop apologizing. Apologies do not pass test suites. Run the negative control probe."
- Executing bounded probe before touching application source code...
```

---

## 🏛️ The 9 Battle-Tested Recovery Strategies

| Strategy ID | Occult Rite | When It Triggers |
| :--- | :--- | :--- |
| **`ghost-terminal-breaker`** | ⚡ **[EXORCISM OF THE ZOMBIE]** | Process hangs, mute terminal $>15$s, swallowed EOF, or unhandled interactive `(y/n)?` prompts. |
| **`environment-triage`** | 🛡️ **[THE WARD OF THE REALM]** | Host barrier (`command not found`, `permission denied`, `EACCES`, `ENOSPC`) mistaken for code bugs. |
| **`api-ground-truth`** | 👁️ **[RITE OF TRUE VISION]** | Hallucinated imports, nonexistent module exports, or guessed API method signatures. |
| **`clean-slate-rollback`** | 🩸 **[THE SEPSIS SACRIFICE]** | $>4$ files edited without tests passing. Forces `git stash` to eliminate cumulative context pollution. |
| **`wrong-altar`** | 🏛️ **[EXPOSING THE FALSE IDOL]** | Editing `src/` while running stale `dist/`, wrong port collision (`EADDRINUSE`), or caching layers. |
| **`check-the-check`** | 🧪 **[THE POISON CHALICE]** | False-green tests. Introduces a deliberate negative control probe to verify the test actually exercises the code. |
| **`assumption-audit`** | 🔬 **[THE HERESY TRIAL]** | Agent accepts an unverified hypothesis as fact. Formulates a cheap probe to disprove it. |
| **`minimal-counterexample`** | ✂️ **[THE BLADE OF PURITY]** | Complex inputs or noisy repros. Halves the payload until the minimal failing atom remains. |
| **`divide-and-conquer`** | 🎯 **[THE BIFURCATION RUNE]** | Multi-stage pipeline regressions. Probes the midpoint boundary to isolate the faulty subsystem. |

---

## 📊 Telemetry: `pray stats`

Track your recovered loops and estimated token savings directly in your terminal:

```bash
pray stats
# or: npx ctrl-alt-pray stats
```

```text
  ┌──────────────────────────────────────────────────────────┐
  │                   CTRL ALT PRAY TELEMETRY                │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  Active Sessions Recorded:  14
  Loops Intercepted:         12
  Loop Recovery Rate:        88.1%
  Estimated Tokens Saved:    ~119,000 tokens (~$1.79)

  TOP STRATEGIES & RITES DISPENSED:
  • ghost-terminal-breaker  : 5 (42%) ████
  • api-ground-truth        : 3 (25%) ███
  • clean-slate-rollback    : 2 (17%) ██
  • environment-triage      : 2 (17%) ██

  Storage: SQLite Native WAL (~/.ctrl-alt-pray/sessions.sqlite)
```

---

## 🔒 2026 Security & Privacy Shield

- **Zero Remote Telemetry**: 100% local-first. No external API keys required.
- **Node 22 Native SQLite**: Zero native C++ compilation; uses native `node:sqlite` in WAL mode (`~/.ctrl-alt-pray/sessions.sqlite`).
- **Automatic Secret Redaction**: All incoming logs, stack traces, and prompts are sanitized through a strict redaction pipeline stripping GitHub tokens (`ghp_`, `github_pat_`), OpenAI/Anthropic keys (`sk-`), AWS keys (`AKIA`), and `Bearer` authorization headers before saving to disk.

---

## 🛠️ Manual MCP Registration

If you prefer to configure your MCP client manually:

### VS Code / Cursor (`.cursor/mcp.json` or `.vscode/mcp.json`)
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

### Claude Code (`~/.claude.json`)
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

## 📜 License

ISC License © 2026 Hoang Yell. Built for developers who refuse to spend another night watching their AI apologize.
