# AGENTS.md — AI Agent Onboarding Guide

Welcome to **Ctrl Alt Pray** (`ctrl-alt-pray`).

> **"When Ctrl+Z isn't enough."**
> An MCP server designed for coding agents stuck in repetitive debugging loops.
> Prayers are optional. Evidence is required.

---

## 1. Mission & Product Thesis

When a coding agent attempts repeated patches against the same failure, reads the same files without gaining new insights, and wastes context without making progress:
- **Ctrl Alt Pray** intervenes by maintaining an explicit, structured **Evidence Ledger**.
- It strictly separates **observed facts** from **untested hypotheses**.
- It rejects repeated, known-failed approaches without new evidence.
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
| **Persistence** | `node:sqlite` (`DatabaseSync`) | Built-in | WAL mode, zero external native binaries |
| **Schema Validation** | `zod` | `^4.6.2` | Input schema definitions for MCP tools |
| **Testing** | `vitest` | `^5.0.0` | Fast contract, strategy & state transition tests |
| **Security Gate** | `cleanroom-guard` | Global | Enforced via `.git/hooks/pre-commit` |

---

## 3. Quick Start

```bash
# 1. Install dependencies
npm ci

# 2. Clean and compile TypeScript
npm run clean && npm run build

# 3. Typecheck
npm run typecheck

# 4. Run test suite
npm test

# 5. Start stdio MCP server
npm start
# Or via global CLI binary
pray
```

---

## 4. MCP Protocol Capabilities (2026 Specification)

### A. Tools Contract

#### 1. `pray`
Initiates a new recovery session OR resumes an existing session.

- **Inputs**:
  - `project_key` (`string`): Unique project namespace.
  - `request_id` (`string`): Trace ID for idempotency (repeated IDs return cached results).
  - `problem` (`string`): Concise description of the stuck goal.
  - `session_id` (`string`, optional): Provide to resume an existing recovery session.
  - `expected_revision` (`number`, optional): Concurrency guard when resuming.
  - `constraints` (`string[]`): Inviolable invariants.
  - `observations` (`string[]`): Hard, verified facts (error logs, exit codes).
  - `attempts` (`string[]`): Approaches already tried and failed.
  - `candidate_hypotheses` (`string[]`): Plausible root causes.
  - `capabilities` (`string[]`): Available host tools (e.g. `bash`, `read_file`).
  - `budget` (`number`): Remaining step budget.
- **Outputs**:
  - `session_id`, `revision`, `assessment`, `next_action`, `decision`.
  - `experiment`: One targeted, testable move selected from the Strategy Catalog.
  - `known_facts`, `assumptions_to_check`, `rejected_approaches`, `handoff`.

#### 2. `report_outcome`
Feeds experimental results back into the ledger and advances state.

- **Inputs**:
  - `project_key`, `session_id`: Target session pointers.
  - `expected_revision`: Concurrency guard (rejects stale updates with `STALE_REVISION`).
  - `request_id`: Idempotency key.
  - `experiment_id` (`string`, optional): ID of the completed experiment.
  - `outcome`: `'supports'` | `'contradicts'` | `'inconclusive'` | `'blocked'`.
  - `observations`: New facts discovered during the experiment.
  - `checks`: Verification tests performed.
- **Outputs**:
  - Advanced `revision`, updated `decision` (`continue`, `pivot`, `ask_user`, `ready_to_verify`), and next experiment.

#### 3. `inspect_ledger`
Read-only inspection of a session's entire audit trail without mutating state.

---

### B. Dynamic Strategy Catalog

The recovery engine automatically selects one focused strategy based on observed symptoms:

1. **`wrong-altar` (Verify Running Target)**:
   - *Trigger*: Code edits have zero observed effect, unchanged error, cache suspected.
   - *Probe*: Injects runtime marker or prints build hash to prove code is actually executing.
2. **`check-the-check` (Validate Measurement)**:
   - *Trigger*: Test passes while bug persists, or logs/coverage are missing.
   - *Probe*: Injects deliberate negative fault to confirm test harness actually runs.
3. **`assumption-audit` (Audit Hypotheses)**:
   - *Trigger*: Candidate hypotheses treated as fact without empirical verification.
   - *Probe*: Direct diagnostic query that attempts to DISPROVE the primary assumption.
4. **`minimal-counterexample`**:
   - *Trigger*: Complex multi-step repro, large payload, flaky pipeline.
   - *Probe*: Reduces input or mocks dependencies to find minimal failing case.
5. **`divide-and-conquer`**:
   - *Trigger*: Data transformation chains, regression histories.
   - *Probe*: Inspects state at the midpoint boundary.
6. **`boundary-check`**:
   - *Trigger*: Default subsystem isolation check.

---

### C. Resources & Prompts

- **Resources**:
  - `session://{session_id}`: Read-only live inspection of session ledger.
  - `sessions://active`: List of all active sessions.
- **Prompts**:
  - `loop-recovery`: Prompts the caller to gather verified observations and assumptions.
  - `falsification-check`: Guides construction of a falsification probe.

---

## 5. Storage & Persistence

- Sessions and idempotency records are stored in local SQLite (`~/.ctrl-alt-pray/sessions.sqlite`) using Node 22 native `node:sqlite` (`DatabaseSync`).
- Data persists across server restarts, subagent context handoffs, and CLI invocations.
