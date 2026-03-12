# Decision: Implementation Plan for Issue #1 — SourceAdapter Pattern + SourceRegistry

**Author:** McNulty (TypeScript Implementer)  
**Date:** 2025-07-18  
**Status:** Proposed — posted to [Issue #1](https://github.com/bradygaster/ACCES/issues/1#issuecomment-4045230035)

## Summary

Reviewed the PRD for Issue #1 and produced a detailed implementation plan covering:

1. **SourceAdapter interface** — `getName()`, `validate()`, `discover(state)` contract
2. **SourceRegistry class** — auto-discovery, parallel execution via `Promise.all`, graceful degradation with per-adapter try/catch
3. **AdapterResult type** — structured output per adapter (name, results, error, duration)
4. **Two concrete adapters:** `RSSSourceAdapter` (from content.ts) and `GitHubSourceAdapter` (from community.ts)
5. **Shared helpers module** — consolidates `generateCanonicalId`, `truncate`, keyword constants
6. **Backward-compat facades** — content.ts and community.ts become thin wrappers during transition
7. **5-step migration** — additive-only first, wire registry, facade, cleanup, verify parity

## PRD Gaps Identified

- Duplicate `generateCanonicalId` in content.ts and taxonomy.ts — needs consolidation
- Duplicate `truncate` helper — needs single source
- Skeleton functions (blog search, YouTube, Reddit, social media) — plan removes them cleanly
- No logging strategy specified — plan keeps adapters pure, registry handles output

## Key Decisions

- Adapters own their constants (RSS_FEEDS, GITHUB_QUERIES stay private)
- Registry validates all adapters in parallel before executing
- Facades preserve import compatibility during transition
- No new dependencies (per PRD requirement)

## Estimated Effort

~2.5-3 hours total across 5 migration steps.

## Full Plan

Posted as comment on Issue #1: https://github.com/bradygaster/ACCES/issues/1#issuecomment-4045230035
