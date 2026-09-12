# Ctrl Alt Pray

**When Ctrl+Z isn't enough.**

An MCP server for coding agents stuck in a loop.

The name is a joke. The recovery process is not.

Ctrl Alt Pray is designed to turn repeated failed attempts into a small, testable next move. It keeps track of what has been tried, separates observations from assumptions, and helps an agent decide whether to investigate, change direction, or ask a human a precise question.

> Prayers are optional. Evidence is required.

## Status

The first runnable MVP is now scaffolded. It exposes `pray` and `report_outcome` over stdio, with an in-memory recovery session engine and contract tests. Persistence, richer strategy selection, and benchmark evaluation are still planned.

## The Idea

An agent tries another patch. The same test fails. It reads the same files again. Nothing new has been learned.

Instead of another blind attempt:

1. Call `pray` with the goal, constraints, observations, and failed attempts.
2. Receive a compact recovery card: what is known, what is missing, and one experiment that could change the next decision.
3. Run that experiment using the host's existing tools and permissions.
4. Call `report_outcome` with the actual result.
5. Continue, pivot, or request one specific piece of human input.

An unsuccessful experiment can still be progress if it eliminates an explanation. A passing test is useful evidence, not a universal guarantee that the task is solved.

## Why an MCP Server?

A prompt can ask an agent to reconsider. A server can also preserve an experiment ledger across context handoffs, reject contradictory session updates, and prevent a known failed approach from being recommended unchanged.

That is a hypothesis to validate, not a claim of proven improvement. The evaluation compares Ctrl Alt Pray against both an unassisted agent and a well-written recovery prompt under matched budgets.

## Boundaries

- Local-first, with no separate LLM API key required for the planned MVP.
- Two agent-facing tools: `pray` and `report_outcome`.
- No shell execution, automatic code edits, remote telemetry, or hidden second agent.
- No fake stress measurements, breathing timers, or claims that waiting makes a model think better.
- No automatic access to the conversation, workspace, or host context controls.
- The host must call the server and supply observations. The server cannot force an agent to follow advice.
- Religious language is playful branding, not a claim of supernatural problem solving.

## Plan

See [PLAN.md](PLAN.md) for the product contract, recovery engine, tool designs, worked examples, privacy model, evaluation, and implementation milestones.

Stack: TypeScript, the official MCP TypeScript SDK, stdio transport, npm or pnpm, and Vitest. The current implementation uses in-memory state; local SQLite storage is planned after the core behavior is tested.

The working repository slug is `ctrl-alt-pray`. The public GitHub repository is [HoangYell/ctrl-alt-pray](https://github.com/HoangYell/ctrl-alt-pray). npm package publication, domain, and trademark availability have not been checked.
