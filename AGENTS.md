# AGENTS.md — AI Agent Onboarding Guide

Welcome to **Ctrl Alt Pray** (`ctrl-alt-pray`).

> **"When Ctrl+Z isn't enough."**  
> An open-source MCP server and epistemic supervisor designed for coding agents stuck in repetitive debugging loops.  
> Prayers are optional. Evidence is required.

---

## 1. Mission & Product Thesis

When a coding agent attempts repeated patches against the same failure, reads the same files without gaining new insights, and wastes context without making progress:
- **Ctrl Alt Pray** intervenes by maintaining an explicit, structured **Epistemic Evidence Ledger**.
- It strictly separates **observed facts** from **untested hypotheses**.
- It rejects repeated, known-failed approaches without new discriminating evidence.
- It returns **one bounded, discriminating experiment** designed to disprove an assumption rather than blindly guessing a solution.

### Core Non-Goals & Boundaries
- **No autonomous mutation**: The server does NOT execute shell commands or edit repository files itself.
- **Local-first**: Zero remote telemetry, zero external LLM API dependencies.
- **Strictly advisory**: The host agent retains execution control and tool permissions.

---

## 2. Tech Stack & Architecture

| Layer | Tool / Dependency | Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | `>= 22.x` | Modern ESM (`"type": "module"`) |
| **Language** | TypeScript | `^7.0.2` | `NodeNext` module resolution, strict mode |
| **Protocol** | `@modelcontextprotocol/server` | `^2.0.0` | Official MCP TypeScript SDK (stdio transport) |
| **Primary Persistence** | `node:sqlite` (`DatabaseSync`) | Built-in | WAL mode, zero external native binaries |
| **Fallback Persistence** | Atomic JSON File Store | Built-in | `sessions.json` with write-and-rename resilience |
| **Schema Validation** | `zod` | `^4.6.2` | Input schema definitions for MCP tools |
| **Testing** | `vitest` | `^5.0.0` | Contract, strategy, state transition & eval tests |
| **Security Gate** | `cleanroom-guard` | Global | Enforced via Git pre-commit hooks |

---

## 3. Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Clean and compile TypeScript
pnpm clean && pnpm build

# 3. Typecheck
pnpm typecheck

# 4. Run test suite (61 tests, 100% pass)
pnpm test

# 5. Run evaluation benchmark (5 regression cases)
pnpm eval

# 6. Start stdio MCP server
pnpm start
# Or via global CLI binary
ctrl-alt-pray
```

---

## 4. MCP Protocol Capabilities (2026 Specification)

### A. Tools Contract

#### 1. `pray`
Initiates a new recovery session OR resumes an existing session.

- **Inputs**:
  - `project_key` (`string`): Unique project namespace.
  - `request_id` (`string`): Trace ID for idempotency (repeated IDs return cached results).
  - `problem` (`string`, optional): Concise description of the stuck goal (auto-harvested if omitted).
  - `auto_harvest` (`boolean`, default: `true`): Automatically scan git churn, `.git/index.lock`, and occupied dev ports.
  - `session_id` (`string`, optional): Provide to resume an existing recovery session.
  - `expected_revision` (`number`, optional): Concurrency guard when resuming.
  - `constraints` (`string[]`): Inviolable invariants.
  - `observations` (`string[]`): Hard, verified facts (error logs, exit codes).
  - `attempts` (`string[]`): Approaches already tried and failed.
  - `candidate_hypotheses` (`string[]`): Plausible root causes.
  - `capabilities` (`string[]`): Available host tools (e.g. `bash`, `read_file`).
  - `budget` (`number`): Remaining step budget.
  - `heresy_mode` (`boolean`, default: `false`): Explicitly activate Heresy Mode to challenge foundational premises.
- **Outputs**:
  - `session_id`, `revision`, `assessment`, `next_action`, `decision`.
  - `pathology`, `pathology_rationale`, `falsification` (100-point rubric score).
  - `experiment`: One targeted, testable move selected from the Strategy Catalog.
  - `known_facts`, `assumptions_to_check`, `rejected_approaches`, `handoff`.
  - `rite`, `incantation`, `divine_favor`, `altar_warning`, `heresy_challenge`, `offering`, `file_flapping`.

#### 2. `report_outcome`
Feeds experimental results back into the ledger and advances state.

- **Inputs**:
  - `project_key`, `session_id`: Target session pointers.
  - `expected_revision`: Concurrency guard (rejects stale updates with `STALE_REVISION`).
  - `request_id`: Idempotency key.
  - `experiment_id` (`string`, optional): ID of the completed experiment.
  - `outcome`: `'supports'` | `'contradicts'` | `'inconclusive'` | `'blocked'`.
  - `observations`: New facts discovered during the experiment.
  - `changes`: Code or environment changes made during probe.
  - `checks`: Verification tests performed.
  - `cost`: Optional host-reported duration, tool calls, or tokens.
- **Outputs**:
  - Advanced `revision`, updated `decision` (`continue`, `pivot`, `ask_user`, `ready_to_verify`), `progress_reason`, `verification_status`, `heresy_challenge`, `offering`, and next experiment.

#### 3. `inspect_ledger`
Read-only inspection of a session's entire audit trail without mutating state.

---

### B. The 12 Canonical Recovery Strategies

1. **`wrong-altar`**: Code edits have no effect; verifies whether test runner is executing stale compiled `dist/` or colliding with background port.
2. **`check-the-check`**: Test passes while defect persists; introduces temporary deliberate negative assertion to verify test actually executes target code.
3. **`ghost-terminal-breaker`**: Subprocess hung or waiting on unhandled interactive prompt; inspects CPU% & terminal tail to safely cascade-kill zombie task.
4. **`api-ground-truth`**: Hallucinated imports or exports; runs one-line runtime reflection probe (`node -e "console.log(Object.keys(import('...')))"`) instead of guessing names.
5. **`clean-slate-rollback`**: Cumulative dirty edits ($\ge 4$ files); stashes scratch churn to clean baseline to isolate atomic red line.
6. **`environment-triage`**: Missing binary, permissions (`EACCES`), or disk quota (`ENOSPC`); verifies host prerequisites before editing source code.
7. **`assumption-audit`**: Primary hypothesis treated as fact; executes isolated probe designed strictly to disprove the assumption.
8. **`minimal-counterexample`**: Bloated payload or noisy repro; halves input repeatedly until atomic failing invariant remains.
9. **`divide-and-conquer`**: Multi-stage transform pipeline or commit regression; logs payload at exact midpoint boundary to halve suspect domain.
10. **`controlled-substitution`**: Two plausible causes; swaps suspect component with verified counterpart while holding all other variables constant.
11. **`boundary-check`**: Subsystem boundary unclear; compares inputs and outputs across boundary before modifying internal logic.
12. **`human-checkpoint`**: Conflicting business rules or missing authorization; formulates one concrete multiple-choice question to human owner.

---

### C. Resources & Prompts

- **Resources**:
  - `session://{session_id}`: Read-only live inspection of session ledger.
  - `session://{session_id}/resurrection`: Clean-context Markdown resurrection packet.
  - `sessions://active`: List of all active sessions.
- **Prompts**:
  - `loop-recovery`: Pre-flight debrief template for an agent caught in a repetitive loop.
  - `falsification-check`: Guides construction of a minimal falsification probe.

---

## 5. CLI Utilities

- `npx ctrl-alt-pray init`: Injects 2-strikes circuit breaker tripwire into active environment.
- `pray-run <cmd>`: Wraps long-running commands with 15s freeze watchdog & cascade tree killer.
- `pray stats`: Displays telemetry on intercepted loops, recovery rates, and estimated tokens saved.
- `ctrl-alt-pray recipes`: Displays the 12 canonical recovery recipes and rites.
- `ctrl-alt-pray resurrect [id]`: Exports a clean-context resurrection packet.
- `ctrl-alt-pray history [id]`: Replays the 3-step decision tree of a recovered loop.
- `ctrl-alt-pray dashboard`: Launches the Apple-grade visual dashboard on `http://127.0.0.1:3900`.
- `ctrl-alt-pray purge`: Purges old sessions and expired idempotency records (>7 days).
