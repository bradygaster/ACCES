# ACCES Source Expansion PRD Issues — Filed 2026-03-12

## Summary
Filed 7 GitHub issues on bradygaster/ACCES as PRDs for source expansion work. All issues labeled `squad` for Ralph's triage queue.

## Issues Created (Dependency Order)

### Foundation (Prerequisite)
- **Issue #1:** [Architecture Refactor: SourceAdapter Pattern + SourceRegistry](https://github.com/bradygaster/ACCES/issues/1)
  - Assigned: McNulty + Stringer
  - Effort: 2.5 sessions
  - Blocks: All Phase 1 & Phase 2 work

### Phase 1 (High Value, Zero Auth)
- **Issue #2:** [Reddit Discovery Adapter](https://github.com/bradygaster/ACCES/issues/2)
  - Assigned: Bunk
  - Effort: 1 session
  - Expected yield: 40-80 posts/week
  - Depends on: #1

- **Issue #3:** [Dev.to API Discovery Adapter](https://github.com/bradygaster/ACCES/issues/3)
  - Assigned: Kima
  - Effort: 1 session
  - Expected yield: 20-40 articles/week
  - Depends on: #1

- **Issue #4:** [Stack Overflow Discovery Adapter](https://github.com/bradygaster/ACCES/issues/4)
  - Assigned: Bunk
  - Effort: 1 session
  - Expected yield: 20-60 questions/week
  - Depends on: #1

- **Issue #5:** [GitHub Discussions Discovery Enhancement](https://github.com/bradygaster/ACCES/issues/5)
  - Assigned: Bunk
  - Effort: 0.5 sessions
  - Expected yield: 10-30 discussions/week
  - Depends on: #1

### Phase 2 (High Value, API Key Required)
- **Issue #6:** [YouTube Discovery Adapter](https://github.com/bradygaster/ACCES/issues/6)
  - Assigned: Kima
  - Effort: 1.5 sessions
  - Expected yield: 30-60 videos/month
  - Requires: YOUTUBE_API_KEY environment variable
  - Depends on: #1

- **Issue #7:** [Podcast Discovery Adapter](https://github.com/bradygaster/ACCES/issues/7)
  - Assigned: Kima
  - Effort: 1 session
  - Expected yield: 5-15 episodes/month
  - Depends on: #1

## Total Effort Estimate
- **Foundation:** 2.5 sessions
- **Phase 1:** 3.5 sessions (4 adapters)
- **Phase 2:** 2.5 sessions (2 adapters)
- **Total:** 8.5 sessions

## Signal Completeness Roadmap
- **Current (RSS + GitHub):** 32% signal completeness
- **After Refactor:** Foundation ready, no signal improvement
- **After Phase 1:** ~50% signal completeness (+Reddit, Dev.to, Stack Overflow, Discussions)
- **After Phase 2:** ~65% signal completeness (+YouTube, Podcasts)

## Next Steps
1. Ralph triages issues and assigns to squad members
2. McNulty + Stringer begin Issue #1 (architecture refactor) immediately
3. Phase 1 adapters parallelized after #1 completes (Bunk + Kima work simultaneously)
4. Phase 2 follows after Phase 1 validation with Beth
5. Each issue becomes a branch → PR → review → merge workflow

---

**Author:** Freamon  
**Date:** 2026-03-12  
**Status:** PRDs filed, awaiting triage
