# Freamon — History

## Project Context

- **Project:** ACCES — Aspire Community Content Engine Squad
- **Stack:** TypeScript, Node.js, Squad SDK, Copilot SDK
- **Owner:** bradygaster (Brady), with Beth Massi as the primary customer/user
- **Purpose:** Continuously discover, dedupe, classify, summarize, and package everything the community ships or says about Aspire (https://aspire.dev/)
- **Run model:** On-demand "daily engine" on Beth's computer producing timestamped output folders

## Learnings

- First session: team initialized 2026-03-05
- **Architecture patterns**:
   - Current discovery structure (content.ts / community.ts) is monolithic and won't scale beyond 3-4 sources
   - Recommendation: Adapter pattern with SourceAdapter interface for plug-and-play source extensibility
   - Registry pattern (SourceRegistry) for auto-discovery, validation, and parallel execution
   - Each adapter owns: env var requirements, rate limiting, error handling, validation logic
- **Source prioritization for Beth**:
   - Phase 1 (quick wins): Reddit JSON API, Dev.to API, Stack Overflow API — no auth, immediate value
   - Phase 2 (API-key): YouTube Data API, podcast RSS — high value, requires config
   - Phase 3 (hard): Social media scrapers (X/LinkedIn/Bluesky), conference crawlers — high effort
- **Key file paths**:
   - Discovery modules: src/discovery/content.ts, src/discovery/community.ts
   - Types: src/types.ts (all interfaces: ContentItem, DiscoveryResult, RunState, etc.)
   - Taxonomy: src/taxonomy.ts (dedupe + classification logic)
   - Pipeline: src/index.ts (orchestrator: load → discover → dedupe → classify → analyze → output)
   - Output: src/output.ts (generates all 9 reports)
   - State: src/state.ts (persists RunState to AspireContentEngine/.state/)
- **User preferences**:
   - Brady prioritizes editorial intelligence breadth (cover as many sources as possible)
   - Beth needs signal quality over volume (actionability: amplify/respond more important than raw counts)
   - Team prefers TypeScript, lean on Node.js built-ins, avoid heavy dependencies unless necessary

#### Cross-Agent Findings (from squad sync 2026-03-12)

**Signal analysis (Omar):** Architecture refactor will unlock 50% signal completeness (Phase 1), 65% with Phase 2 (YouTube), 82% with all sources. Current bottleneck is monolithic discovery files.

**Community discovery (Bunk):** Prioritizes Reddit > Stack Overflow > GitHub Discussions for immediate Phase 1 value. X/Twitter deferred due to API cost (\/month). LinkedIn deferred in favor of link enrichment.

**Content discovery (Kima):** RSS expansion + YouTube + podcasts gives 85%+ blog coverage. Multi-source deduplication strategy (sha256 canonical IDs) scales to 20+ sources.

**Squad consensus:** Refactor first (2.5 sessions), then Phase 1 (2-3 sessions). This gives Brady technical debt cleanup + Beth immediate editorial ROI. Phase 2 & 3 follow after Phase 1 validation.
