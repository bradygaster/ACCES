# Decision: Squad SDK Integration Pattern for SourceAdapter Refactor

**Author:** Stringer (Squad SDK Orchestrator)  
**Date:** 2025-07-18  
**Status:** Proposed — Architectural review of Issue #1  
**Issue:** [#1 Architecture Refactor: SourceAdapter Pattern + SourceRegistry](https://github.com/bradygaster/ACCES/issues/1)

## Context

Brady requested that the SourceAdapter pattern "use the Squad SDK for the functionality" and be "a pluggable system using our SDK." I reviewed the actual Squad SDK (`@bradygaster/squad-sdk@0.8.24`) internals against the PRD requirements for Issue #1.

## Decision: Inspired-By, Not Coupled-To

**Mirror Squad SDK patterns in standalone TypeScript interfaces. Do not add `@bradygaster/squad-sdk` as a runtime dependency.**

### Rationale

1. **PRD constraint:** "No new external dependencies." Squad SDK transitively brings `@github/copilot-sdk` + `vscode-jsonrpc` — too heavy for a CLI content engine.
2. **Semantic mismatch:** Squad's `SkillSource` loads markdown knowledge files. ACCES adapters execute async I/O against external APIs. Same shape, different semantics.
3. **Future-proof:** By mirroring the contract, a Squad SDK bridge is trivial (~10 LOC) if we later want agents to invoke discovery.

### Squad SDK Patterns to Mirror

| SDK Pattern | ACCES Pattern | Key Methods |
|---|---|---|
| `SkillSource` | `SourceAdapter` | `name`, `validate()`, `discover()` |
| `SkillSourceRegistry` | `SourceRegistry` | `register()`, `validateAll()`, `discoverAll()` |
| `ErrorFactory.wrap()` + `SquadError` | `AdapterError` | Severity, recoverability, original error wrapping |
| `EventBus` error isolation | `Promise.allSettled()` in registry | Per-adapter isolation, pipeline continues on failure |

### Interface Design

```typescript
export interface SourceAdapter {
  readonly name: string;          // kebab-case, Squad convention
  readonly displayName: string;
  readonly channel: Channel;
  validate(): Promise<AdapterValidation>;
  discover(state: RunState): Promise<DiscoveryResult[]>;
}

export interface AdapterValidation {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}

export class SourceRegistry {
  register(adapter: SourceAdapter): void;
  list(): string[];
  validateAll(): Promise<Map<string, AdapterValidation>>;
  discoverAll(state: RunState): Promise<RegistryResult>;
}

export interface RegistryResult {
  results: DiscoveryResult[];
  errors: Map<string, Error>;
  skipped: string[];
  timing: Map<string, number>;
}
```

### Registration Strategy

Explicit `register()` calls, not filesystem auto-discovery. Squad's `loadSkillsFromDirectory()` works for markdown; TypeScript adapters need explicit imports for type safety and tree-shaking.

### Scope Boundary

Only the discovery layer gets the adapter pattern. Dedupe, classify, analyze, and output remain pure functions. Don't over-engineer stages that don't need pluggability yet.

### What Changes in index.ts

Before: Two hardcoded `discoverContent()` / `discoverCommunity()` calls with manual error handling.

After: `createDefaultRegistry()` → `registry.discoverAll(state)` — single call, parallel execution, automatic error isolation.

## Implications

- **McNulty:** Implement `SourceAdapter` interface, `SourceRegistry` class, extract `RSSSourceAdapter` + `GitHubSourceAdapter` from existing code
- **Kima/Bunk:** Phase 1 adapters (Reddit, Dev.to, Stack Overflow) implement `SourceAdapter` — no changes to orchestrator
- **Future:** Squad SDK bridge is ~10 LOC when needed — don't build until an agent needs to invoke discovery programmatically

## Alternatives Considered

1. **Tight coupling (import Squad SDK):** Rejected — violates "no new deps" constraint, brings heavyweight transitive deps
2. **Adapters AS Squad skills:** Rejected for now — skills are knowledge injection, not I/O execution; bridge later
3. **Filesystem auto-discovery:** Rejected — not type-safe, breaks tree-shaking, debugging harder

---

*Comment posted on Issue #1: https://github.com/bradygaster/ACCES/issues/1#issuecomment-4045233243*
