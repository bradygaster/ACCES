# Squad Team

> Aspire Community Content Engine Squad — discovers, dedupes, classifies, and packages community content about Aspire

## Coordinator

| Name | Role | Notes |
|------|------|-------|
| Squad | Coordinator | Routes work, enforces handoffs and reviewer gates. Does not generate domain artifacts. |

## Members

| Name | Role | Charter | Status |
|------|------|---------|--------|
| Freamon | Lead / Editor-in-Chief | `.squad/agents/freamon/charter.md` | ✅ Active |
| McNulty | TypeScript Implementer | `.squad/agents/mcnulty/charter.md` | ✅ Active |
| Kima | Source Scout (Content) | `.squad/agents/kima/charter.md` | ✅ Active |
| Bunk | Source Scout (Community) | `.squad/agents/bunk/charter.md` | ✅ Active |
| Omar | Signal Analyst | `.squad/agents/omar/charter.md` | ✅ Active |
| Bubbles | Taxonomy + Dedupe Librarian | `.squad/agents/bubbles/charter.md` | ✅ Active |
| Daniels | Copilot SDK Specialist | `.squad/agents/daniels/charter.md` | ✅ Active |
| Stringer | Squad SDK Orchestrator | `.squad/agents/stringer/charter.md` | ✅ Active |
| Scribe | Session Logger | `.squad/agents/scribe/charter.md` | 📋 Silent |
| Ralph | Work Monitor | — | 🔄 Monitor |

## Human Members

| Name | Role | Status |
|------|------|--------|
| Beth Massi | Customer / Primary User | 👤 Human |

## Coding Agent

<!-- copilot-auto-assign: false -->

| Name | Role | Charter | Status |
|------|------|---------|--------|
| @copilot | Coding Agent | — | 🤖 Coding Agent |

### Capabilities

**🟢 Good fit — auto-route when enabled:**
- Bug fixes with clear reproduction steps
- Test coverage (adding missing tests, fixing flaky tests)
- Lint/format fixes and code style cleanup
- Dependency updates and version bumps
- Small isolated features with clear specs
- Boilerplate/scaffolding generation
- Documentation fixes and README updates

**🟡 Needs review — route to @copilot but flag for squad member PR review:**
- Medium features with clear specs and acceptance criteria
- Refactoring with existing test coverage
- New source scout implementations following existing patterns

**🔴 Not suitable — route to squad member instead:**
- Architecture decisions and system design
- Multi-source integration requiring coordination
- Taxonomy and classification rule changes
- Signal analysis methodology decisions
- Copilot SDK or Squad SDK integration design
- Changes requiring Beth's input or approval

## Project Context

- **Owner:** bradygaster (Brady)
- **Customer:** Beth Massi — runs the engine on her machine, uses the reports for editorial/community planning
- **Stack:** TypeScript, Node.js, Squad SDK, Copilot SDK
- **Description:** On-demand "daily engine" that discovers, dedupes, classifies, summarizes, and packages everything the community ships or says about Aspire (https://aspire.dev/)
- **Universe:** The Wire
- **Created:** 2026-03-05
