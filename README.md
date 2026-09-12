<div align="center">

# 🕯️ Ctrl Alt Pray

### *When Ctrl+Z isn't enough. Pray.*

**The anti-doom-loop circuit breaker for Cursor, Claude Code, and autonomous AI agents.**  
*Stops circular edits. Kills frozen terminals. Forces your AI to find the real bug.*

[![GitHub Stars](https://img.shields.io/github/stars/HoangYell/ctrl-alt-pray?style=social)](https://github.com/HoangYell/ctrl-alt-pray)
[![Release](https://img.shields.io/badge/version-2.0.0-6366f1.svg?style=flat-square)](package.json)
[![Tests](https://img.shields.io/badge/tests-32%2F32%20passing-10b981.svg?style=flat-square)](tests/)
[![Runtime](https://img.shields.io/badge/node-%E2%89%A522-f59e0b.svg?style=flat-square)](https://nodejs.org)
[![Zero External Runtime Deps](https://img.shields.io/badge/dependencies-0%20runtime-14b8a6.svg?style=flat-square)](#-why-developers-star-this)
[![License](https://img.shields.io/badge/license-ISC-0ea5e9.svg?style=flat-square)](LICENSE)

```text
       🕯️  THE ALTAR OF GROUND TRUTH HAS BEEN SUMMONED  🕯️
       [ PRAYERS ARE OPTIONAL. FALSIFIABLE EVIDENCE IS REQUIRED. ]
```

**[⭐ Star on GitHub](https://github.com/HoangYell/ctrl-alt-pray) • [Quickstart in 10s](#-quickstart-10-seconds) • [Before vs After](#-the-300-am-agony-before-vs-after) • [How It Works](#-how-it-works) • [Commands](#-cli-cheat-sheet)**

</div>

---

## 💀 The 3:00 AM Agony: Before vs After

You know this exact pain:

| ❌ Without `ctrl-alt-pray` | ✅ With `ctrl-alt-pray` |
| :--- | :--- |
| **Attempt 1:** AI edits line 42. Test fails. | **Attempt 1:** AI edits line 42. Test fails. |
| **Attempt 2:** *"I apologize for the confusion! Let me fix that!"* Edits line 42 again. Test fails. | **Attempt 2:** AI tries again and fails. **CABLE TRIPS.** |
| **Attempt 3:** AI edits line 43. Still fails. | **🚨 Circuit Breaker activates**: AI is forbidden from making further edits. |
| **Attempt 5:** Terminal hangs for 15 minutes because a background watcher swallowed EOF. | **🛡️ Guardian kills frozen process**: Recursively slays zombie child processes. |
| **Attempt 8:** 14 dirty files churned. Context window poisoned. | **🌾 Universal Harvester**: Checks git & ports, tells AI: *"You edited `src/` but tests are running against stale `dist/`."* |
| **Result:** $28 in API tokens burned. Bug still broken. | **Result:** Bug resolved in 30 seconds. **$0.02 spent.** |

> **The Hard Law of Coding Agents:**  
> If an AI fails twice on the same bug, **trying a third time with the same assumptions has a <4% success rate**. It will just apologize, hallucinate, and burn your money.

---

## ⚡ Quickstart (10 Seconds)

### Step 1: Arm your project

Run this once in the root of any repository:

```bash
npx ctrl-alt-pray init
```

That's it. It automatically detects your workspace and injects the **2-Strikes Circuit Breaker**:
- **Cursor**: Injects tripwire into `.cursorrules` and generates `.vscode/mcp.json`.
- **Claude Code**: Injects into `CLAUDE.md`.
- **Antigravity / Gemini**: Injects into `GEMINI.md`.
- **Cline / Roo Code**: Injects into `.clinerules`.
- **OpenCode**: Configures `opencode.jsonc`.

### Step 2: Code as usual

Your AI will code normally. But the moment it fails twice in a row, the tripwire forces it to summon the **Altar of Ground Truth (`pray`)** instead of guessing.

---

## 🛑 The Injected Tripwire (The Magic Rule)

Here is the exact rule `npx ctrl-alt-pray init` gives your AI agent:

```markdown
<!-- START CTRL-ALT-PRAY TRIPWIRE -->
### 🛑 Anti-Doom-Loop Circuit Breaker (ctrl-alt-pray)
1. STRICT 2-FAILURE LIMIT: If ANY test or command fails twice with the same error, STOP editing immediately.
2. NO BLIND GUESSING: Do not touch application code a 3rd time without verified new evidence.
3. MANDATORY ACTION: Invoke MCP tool 'pray'. It will freeze your speculative edits and provide ONE atomic negative-control experiment.
4. TERMINAL FREEZE: If a command hangs >15s with zero output, kill it and invoke 'pray' (strategy="ghost-terminal-breaker").
5. ZERO APOLOGIES: Do not apologize. State your single testable hypothesis and run the probe.
<!-- END CTRL-ALT-PRAY TRIPWIRE -->
```

---

## 🛡️ Active Terminal Guardian (`pray-run`)

Tired of your AI launching `npm test` or `vite` and hanging for 20 minutes because it forgot `-w=false` or hit an unhandled `(y/n)?` prompt?

Run any command with `pray-run`:

```bash
pray-run npm test
# or
pray-run pnpm test:visual
```

### What Guardian does:
- **15s Freeze Watchdog**: If a command emits zero output for 15s, Guardian terminates it immediately.
- **Cascade Process-Tree Killer**: Slay not just the parent PID, but **all orphaned child processes** (`node`, `vitest`, `esbuild`) so ports like `:3000` or `:5173` never get stuck with `EADDRINUSE`.
- **Flapping Circuit Breaker**: If a command fails 3 times consecutively with the same exit code, Guardian blocks further runs and shows an unmissable banner demanding the AI invoke `pray`.

---

## 🌾 Universal Harvester (Zero-Argument Calling)

When your AI is having a panic attack, it doesn't even need to construct a complicated JSON payload. It can call `pray` with **zero arguments**:

```json
// The AI simply calls:
{}
```

The **Universal Harvester** automatically inspects reality:
1. **Git Churn**: Detects dirty uncommitted files and `.git/index.lock` collisions.
2. **Socket Probe**: Checks dev ports (`3000`, `4321`, `5173`, `8080`, `9222`) for orphaned zombie servers holding ports hostage.
3. **Root-Cause Isolation**: Identifies whether the bug is code, caching, build artifacts, or port collisions.

---

## 📊 Apple-Grade Visual Dashboard

Track all recovered loops, intercepted hallucinations, and token savings:

```bash
ctrl-alt-pray dashboard
```

- **Live UI**: Opens at `http://127.0.0.1:3900`.
- **Offline HTML Export**: Also saves a single, self-contained offline report to `~/.ctrl-alt-pray/dashboard.html`.
- **Linear/Apple Clean**: Slate palette (`#090d16`), 100% SVG vector icons, zero gaudy gradients.
- **Session Inspector**: Click any session to inspect exact handoff notes and disproven hypotheses.

Want a quick terminal summary instead?

```bash
pray stats
```

```text
  ┌──────────────────────────────────────────────────────────┐
  │                   CTRL ALT PRAY TELEMETRY                │
  │            "When Ctrl+Z isn't enough. Pray."             │
  └──────────────────────────────────────────────────────────┘

  Active Sessions Recorded:  18
  Loops Intercepted:         16
  Loop Recovery Rate:        88.9%
  Estimated Tokens Saved:    ~153,000 tokens (~$2.29)

  TOP STRATEGIES DISPENSED:
  • ghost-terminal-breaker  : 7 (44%) ████
  • api-ground-truth        : 4 (25%) ███
  • wrong-altar             : 3 (19%) ██
```

---

## 🏛️ The 10 Recovery Strategies

When `pray` is invoked, it selects the single best strategy to break the impasse:

| Strategy | When it Triggers | The Prescribed Action |
| :--- | :--- | :--- |
| **`ghost-terminal-breaker`** | Mute terminal >15s or hung pipes | Kill child process tree, clean `.git/index.lock`, free ports. |
| **`wrong-altar`** | Edits `src/` while test runs old `dist/` | Purge build caches, verify timestamps before editing code. |
| **`api-ground-truth`** | Hallucinated imports or guessed exports | Run 1-line script to print `Object.keys()` of real module. |
| **`clean-slate-rollback`** | $\ge 4$ files modified without passing | `git stash` to clean baseline; test one isolated line. |
| **`environment-triage`** | Missing binaries, `EACCES`, `ENOSPC` | Check system `PATH`, node version, and disk space. |
| **`check-the-check`** | Tests passing despite broken behavior | Inject intentional failing assert to prove test actually runs. |
| **`assumption-audit`** | Fixating on unproven hypothesis | Run minimal probe specifically designed to *disprove* it. |
| **`minimal-counterexample`** | Massive failing payloads / noisy logs | Halve test input repeatedly until minimal repro remains. |
| **`divide-and-conquer`** | Multi-stage pipeline regression | Log data at pipeline midpoint to isolate the broken half. |
| **`boundary-check`** | Edge-case or off-by-one errors | Probe exact boundary conditions (`null`, empty, `0`, `-1`). |

---

## 🧙‍♂️ Occult Easter Eggs & The Anti-Apology Scowl

We built this with high-performance engineering, but we gave it personality. When your AI calls `pray`, check its hidden `<thinking>` trace:

### 1. The Anti-Apology Scowl
If your AI starts groveling (*"I deeply apologize for the confusion! Let me correct..."*), the Altar slaps it:

```text
[THE ALTAR SCOWLS]
Stop apologizing. Groveling does not pass test suites.
The Altar demands falsifiable evidence. State your thesis and execute the probe.
```

### 2. The "Nhân Phẩm" (Karma RNG) Roll
The AI receives a karma roll (1–100) inside its reasoning context:

```text
Thinking Process:
- Test failed twice on stale import. Tripping circuit breaker...
- Calling MCP tool 'pray'...
- Received Rite: 🏛️ [EXPOSING THE FALSE IDOL]
- Nhân Phẩm Roll: 96/100 (Thượng Thượng Phẩm — Divine Favor).
- "The artifact is dead, yet you worship its ghost. Purge dist/ and re-verify."
- Purging dist/ before touching any application code.
```

---

## 💎 Why Developers Star This

- **Zero External Runtime Dependencies**: Built entirely on standard Node.js modules and native `node:sqlite` in WAL mode. No C++ bindings, no `node-gyp`, no bloat.
- **Zero Remote Telemetry**: 100% local. Your code, stack traces, and prompts never leave your machine.
- **Automatic Secret Redaction**: Strips `ghp_`, `github_pat_`, `sk-`, and `Bearer` tokens before writing anything to disk.
- **Ultra-Lightweight**: Boots in <10ms.

---

## 📟 CLI Cheat Sheet

```bash
# 1. Arm any repository with the 2-Strikes circuit breaker
npx ctrl-alt-pray init

# 2. Run commands with freeze protection (>15s) and zombie cleanup
pray-run npm test

# 3. View saved tokens and recovery rate
pray stats

# 4. Open local visual dashboard
ctrl-alt-pray dashboard
```

---

## 🛠️ Manual MCP Setup

If you prefer to configure your editor manually:

### Cursor (`.cursor/mcp.json` or `.vscode/mcp.json`)
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

## 🤝 Community & Support

If **Ctrl Alt Pray** saved you even **one** 3:00 AM debugging headache or $10 in wasted tokens:

⭐ **[Star this repository on GitHub](https://github.com/HoangYell/ctrl-alt-pray)** — it helps other tired developers find it!

Report bugs or suggest new recovery rites on [GitHub Issues](https://github.com/HoangYell/ctrl-alt-pray/issues).

---

## 📜 License

ISC License © 2026 [Hoang Yell](https://github.com/HoangYell).  
*Built for developers who refuse to spend another night watching their AI apologize.*
