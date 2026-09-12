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
| **Schema Validation** | `zod` | `^4.6.2` | Input schema definitions for MCP tools |
| **Testing** | `vitest` | `^5.0.0` | Fast contract & state transition tests |
| **Security Gate** | `cleanroom-guard` | Global | Enforced via `.git/hooks/pre-commit` |

---

## 3. Quick Start

```bash
# 1. Install dependencies
npm ci

# 2. Compile TypeScript
npm run build

# 3. Run test suite
npm test

# 4. Start stdio MCP server
npm start
```

---

## 4. MCP Tools Contract

### A. `pray`
Initiates or resumes a recovery session for an agent stuck in a loop.

- **Inputs**:
  - `project_key` (`string`): Unique project namespace.
  - `request_id` (`string`): Trace ID for idempotency.
  - `problem` (`string`): Concise description of the stuck goal.
  - `constraints` (`string[]`): Inviolable invariants (e.g. "cannot change database schema").
  - `observations` (`string[]`): Hard, verified facts (error logs, exit codes).
  - `attempts` (`string[]`): Approaches already tried and failed.
  - `candidate_hypotheses` (`string[]`): Plausible root causes.
  - `capabilities` (`string[]`): Available host tools (e.g. `bash`, `read_file`).
  - `budget` (`number`): Remaining step budget.
- **Outputs**:
  - `session_id`: Opaque recovery session identifier.
  - `revision`: Current session version (increments per outcome).
  - `assessment`: `possible_loop` | `insufficient_evidence` | `progress` | `blocked`.
  - `next_action`: `experiment` | `request_evidence` | `ask_user`.
  - `experiment`: One targeted, testable move with expected outcome and risk.
  - `handoff`: Condensed snapshot for context handoffs.

### B. `report_outcome`
Feeds the observed experimental result back into the recovery ledger.

- **Inputs**:
  - `project_key`, `session_id`: Session pointers.
  - `expected_revision`: Concurrency guard (rejects stale updates).
  - `outcome`: `supports` | `contradicts` | `inconclusive` | `blocked`.
  - `observations`: New facts discovered during the experiment.
  - `checks`: Verification tests performed.
- **Outputs**:
  - Incremented `revision`.
  - Updated `decision`: `continue` | `pivot` | `ask_user` | `ready_to_verify`.
  - Next recommended action.

---

## 5. Repository Structure

```
ctrl-alt-pray/
├── .github/
│   └── workflows/ci.yml      # GitHub Actions CI (build + test)
├── .vscode/
│   └── mcp.json               # Local VS Code MCP server definition
├── src/
│   ├── index.ts               # Stdio MCP server entry point & tool registration
│   └── recovery.ts            # Recovery engine, session ledger, & state machine
├── tests/
│   └── recovery.test.ts       # Vitest contract tests for recovery flow
├── AGENTS.md                  # Agent onboarding guide (this file)
├── PLAN.md                    # Canonical architectural blueprint & RFC
├── README.md                  # Public overview & brand identity
├── package.json               # Scripts & dependencies
└── tsconfig.json              # TypeScript configuration
```

---

## 6. Engineering & Testing Standards

1. **Always verify before commit**:
   - Run `npm run build && npm test` to ensure zero compilation or regression failures.
   - Git hook `cleanroom-guard check --staged` will automatically prevent leaking secrets or unauthorized benchmarks.
2. **Deterministic State Transitions**:
   - Any state change in `recovery.ts` MUST update `revision`.
   - Stale revisions must throw explicit concurrency errors.
3. **Single Source of Truth**:
   - Architectural decisions must align with [PLAN.md](PLAN.md).
