# Stringer — History

## Project Context

- **Project:** ACCES — Aspire Community Content Engine Squad
- **Stack:** TypeScript, Node.js, Squad SDK, Copilot SDK
- **Owner:** bradygaster (Brady), with Beth Massi as the primary customer/user
- **Purpose:** Design and implement Squad SDK orchestration for the ACCES content engine pipeline
- **Pipeline:** discovery → normalize → dedupe → classify → analyze → output

## Learnings

- First session: team initialized 2026-03-05
- **2025-07-18 — Issue #1 SDK Architecture Review:** Reviewed PRD for SourceAdapter pattern against Squad SDK (`@bradygaster/squad-sdk@0.8.24`) internals. Key finding: Squad SDK's `SkillSource`/`SkillSourceRegistry` patterns are the right structural inspiration, but the SDK itself should NOT be a runtime dependency (transitive deps too heavy, semantic mismatch between markdown skill loading and async I/O discovery). Recommended "inspired-by, not coupled-to" approach. Posted architectural review on Issue #1 with proposed interfaces, error handling strategy, and registration pattern. Decision doc written to `.squad/decisions/inbox/stringer-issue1-sdk-design.md`.
- **SDK patterns mapped to ACCES:** `SkillSource` → `SourceAdapter`, `SkillSourceRegistry` → `SourceRegistry`, `ErrorFactory.wrap()` → `AdapterError`, `EventBus` error isolation → `Promise.allSettled()`. Registration should be explicit (not filesystem scanning). Only discovery layer needs adapter pattern — other pipeline stages stay as pure functions.
- **Future bridge design:** A Squad SDK bridge (adapters → skills) is ~10 LOC via `defineSkill()`. Don't build until agents need to invoke discovery programmatically.
