# Changelog

All notable changes to `ctrl-alt-pray` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-09-30

### Changed
- **Modern Linear/Apple minimalist UI/UX redesign** (`docs/index.html`): Replaced emoji-heavy nav and raw icon fonts with 100% vector Lucide icons, clean slate-900 background, subtle 1px borders, responsive mobile drawer, and proper tab layout with zero horizontal overflow.
- **Zero-emoji standardization**: Purged all raw emoji from UI buttons, docks, and nav controls across the site.
- **Tech-Occultism mode revamp**: Added burning incense animation, audio synth effects, and divine-favor dice with full English localization. Cyber-shrine UI with `cyber-altar-shrine` asset integration.
- **Homepage and README clarity rewrite**: Replaced hype-first copy with direct developer pain points, practical `pray` CLI use cases, concrete before/after examples, and realistic 10-second quickstart.
- **New visual assets**: `cyber-altar-shrine.png/webp`, `divine-favor-dice.png/webp`, `zombie-exorcism.png/webp` added for richer context-specific illustrations.

## [2.0.0] - 2026-09-12

### Added
- **Visual dashboard** (`pray dashboard`): Terminal-rendered session analytics, strategy hit-rate stats, budget burn tracking.
- **WAL-resilient SQLite persistence**: Write-Ahead Logging for crash-safe evidence ledger across concurrent agent sessions.
- **Resurrection packets** (`pray resurrect`): Cross-session state export for agent handoffs and context recovery.
- **Universal harvester** (`pray`): Zero-argument self-sensing - detects current repo, agent session, and active problem context automatically.
- **pray-run guardian** (`pray-run <cmd>`): Active terminal guardian with 15s freeze watchdog and cascade process tree killer.
- **Second Opinion engine** (`pray --second-opinion`): Devil's advocate critique via MCP sampling.
- **Prayer Book** (`pray recipes`): Curated falsifiable experiment templates for common AI anti-patterns.
- **One-click MCP setup**: 1-click install deep-links for Cursor, VS Code, Claude Code, Windsurf, Cline, JetBrains AI.
- **init ignition** (`pray init`): Guided project bootstrapping with editor-specific MCP config generation.
- **Tech-Occultism mode**: Anti-entropy ritual interface for the truly desperate.
- **MCP 2026 upgrade**: Dynamic strategy catalog, resource endpoints, SQLite persistence, `pray --dry-run` support.

### Changed
- Complete TypeScript rewrite with modular architecture: `recovery`, `storage`, `critique`, `harvester`, `guardian`, `dashboard`, `resurrection`, `recipes`, `site`.
- 100% English localization for open-source release readiness.
- Robust symlink entrypoint resolution for npm package boundaries.
- `74/74` test coverage across all core modules.
