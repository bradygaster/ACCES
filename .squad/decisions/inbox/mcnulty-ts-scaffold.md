# Decision: TypeScript Project Foundation

**Author:** McNulty (TypeScript Implementer)
**Date:** 2025-07-18

## What

Scaffolded the full ACCES TypeScript project with strict mode, ES2022 target, NodeNext module resolution. Minimal dependencies: `tsx`, `typescript`, `@types/node`, `rss-parser`, `@octokit/rest`.

## Why

The team needs a buildable, runnable foundation. Every module has typed interfaces, the pipeline is wired end-to-end, and `npm start` runs the full engine immediately. Skeleton functions are clearly marked for scouts to fill.

## Key decisions

- **`(string & {})` for Channel type** — allows known union values + arbitrary strings without losing autocomplete
- **Canonical ID = sha256 hash, 16 hex chars** — deterministic, collision-resistant, human-inspectable
- **State serialized as JSON** with Set→array and Map→object conversion (no external deps)
- **rss-parser** for RSS (Kima's scout work), **@octokit/rest** for GitHub (Bunk's scout work)
- **All 9 report files** generated in parallel via Promise.all for speed
- **Graceful error handling** — partial discovery results are kept even if one source fails
