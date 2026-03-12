# Squad Decisions

## Active Decisions

### Decision: Community Discovery Source Gap Analysis

**Author:** Bunk (Source Scout — Community)  
**Date:** 2026-03-06  
**Status:** Audit Complete — Ready for Implementation Planning

**Summary:**
The ACCES engine currently implements GitHub discovery only, leaving 7 major community sources untouched. Reddit, Stack Overflow, Discord, GitHub Discussions, and social platforms represent significant blind spots in adoption signals. Current coverage: ~20% of community signal.

**Key Recommendations:**
1. Implement GitHub Discussions (quick win, 30 min)
2. Implement Reddit JSON API (2 hours, high yield)
3. Implement Stack Overflow API (2 hours, high yield)
4. Defer X/Twitter (API costs ~$5k/month, low ROI)
5. Defer LinkedIn (scraping violates ToS, recommend link enrichment instead)
6. Defer Discord (requires server admin approval)

**Implementation Roadmap:**
- **Phase 1 (Immediate):** GitHub Discussions, Reddit, Stack Overflow
- **Phase 2 (Medium-effort):** Bluesky, Mastodon
- **Phase 3 (Deferred):** X, LinkedIn, Discord

---

### Decision: Signal Gap Analysis: What Beth Can't See (Yet)

**Author:** Omar (Signal Analyst)  
**Date:** 2026-03-05  
**Status:** Complete

**Summary:**
ACCES currently captures only ~32% of the actual Aspire community conversation through RSS feeds and GitHub. Five critical signal blind spots leave Beth unable to detect adoption friction, confusion patterns, creator influence, viral moments, and industry narrative.

**Current Signal Completeness Score: 32%**
- Blog Content: 85% | GitHub Activity: 90% | Tech Adoption: 40%
- Real Pain/Confusion: 15% | Community Mood: 5% | Decision-Maker Signals: 10%
- Creator Influence: 0% | Viral Moments: 0% | Industry Narrative: 20%

**Critical Blind Spots (by priority):**
1. **Reddit** — Real-time community questions, pain signals, adoption stories (HIGH)
2. **YouTube** — Creator ecosystem, tutorial gaps, influencer reach (HIGH)
3. **Stack Overflow** — Eternal pain patterns, documentation gaps (MEDIUM-HIGH)
4. **Social Media (X, LinkedIn, Bluesky)** — Amplification, community mood (MEDIUM-HIGH)
5. **Podcasts** — Industry narrative, thought leadership (MEDIUM)

**Projected Completeness with All Sources: 82%**

---

### Decision: ACCES Source Expansion Roadmap

**Author:** Freamon (Lead / Editor-in-Chief)  
**Date:** 2026-03-05  
**Status:** Proposed for team review

**Summary:**
Current ACCES architecture (monolithic discovery files) cannot scale beyond 3-4 sources. Proposes implementing SourceAdapter pattern with SourceRegistry for plug-and-play extensibility, followed by phased rollout of discovery sources.

**Architecture Recommendation:**
- Implement SourceAdapter interface with centralized SourceRegistry
- Benefits: Clean separation, graceful degradation, parallel execution, easy testing, simple extension

**Phased Rollout:**
- **Refactor** (2.5 sessions): Adapter pattern, no new dependencies
- **Phase 1** (2-3 sessions): Reddit, Dev.to, Stack Overflow — High value, zero auth
- **Phase 2** (2-3 sessions): YouTube, Podcasts — High value, requires API key config
- **Phase 3** (4-6 sessions): Bluesky, X RSS, HN, Conferences — Medium value, high effort

**Recommended Sequence:** Refactor → Phase 1 → Phase 2 → Phase 3 (as-needed)

---

### Decision: TypeScript Project Foundation

**Author:** McNulty (TypeScript Implementer)  
**Date:** 2025-07-18  
**Status:** Complete

**Summary:**
Scaffolded ACCES TypeScript project with strict mode, ES2022 target, NodeNext module resolution. Minimal dependencies: tsx, typescript, @types/node, rss-parser, @octokit/rest.

**Key Technical Decisions:**
- `(string & {})` for Channel type — allows known union + arbitrary strings without losing autocomplete
- Canonical ID = sha256 hash, 16 hex chars — deterministic, collision-resistant
- State serialized as JSON with Set→array and Map→object conversion (no external deps)
- All 9 report files generated in parallel via Promise.all
- Graceful error handling — partial discovery results kept even if one source fails

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
