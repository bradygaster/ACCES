# Kima — History

## Project Context

- **Project:** ACCES — Aspire Community Content Engine Squad
- **Stack:** TypeScript, Node.js, Squad SDK, Copilot SDK
- **Owner:** bradygaster (Brady), with Beth Massi as the primary customer/user
- **Purpose:** Discover Aspire-related content from blogs, video, podcasts, conferences, and official Microsoft channels
- **Source families:** Blogs/RSS/Medium/Substack/Dev.to, YouTube/Twitch/podcasts, Conferences/Meetups, Microsoft/official channels

## Learnings

### Session 2026-03-05: Content Source Gap Analysis

#### Discovered Patterns
- **RSS feeds are the lowest-friction source:** Dev.to, Microsoft blogs all use RSS. This pattern should be expanded to podcasts and any new feeds discovered.
- **Multi-source deduplication is critical:** Same content (esp. talks) reappear across YouTube, blogs, social media, conferences. Need a robust canonical ID strategy.
- **API availability varies widely:** Official Microsoft channels have simple URLs; YouTube/Reddit are well-documented; Substack/Medium are either deprecated or behind scraping concerns.

#### Key Implementation Notes
- All sources feed into `ContentItem` type from `src/types.ts` — no custom models needed
- `generateCanonicalId()` function (SHA256 of title+url+author+date) is stable and reusable
- `isAspireRelated()` + `isExcluded()` helpers should remain the core relevance filter
- Topic extraction via keyword matching works well for broad categories; fine-tuning will happen later

#### Architecture Decisions
- **Blog discovery strategy:** Start with RSS for low-friction sources (podcasts), then layer Hashnode API (free, clean). Defer Medium scraping until yield metrics justify the effort.
- **Social media:** X API and Bluesky are viable; LinkedIn is blocked (TOS). Recommend X + Bluesky for Phase 2.
- **Conferences:** No single API. Must implement per-conference (NDC scraper first, then .NET Conf, Build). Manual watchlist is acceptable until volume justifies automation.
- **Podcast feeds:** Expand `RSS_FEEDS` constant to include 5–10 known .NET podcasts. Zero API cost, high long-tail value.

#### For Next Scout Sessions
- YouTube implementation should leverage `@googleapis/youtube` package; start with simple title-based search
- Reddit can use either RSS (lower friction) or PRAW (higher signal); recommend RSS-first approach for simplicity
- When implementing blog platforms, coordinate with Bubbles (taxonomy scout) on topic inference; many platforms use custom tag systems
- All new sources should write raw evidence to `/raw/` folder (JSON snippets of API responses or feed excerpts) for auditability

#### Files Modified / Created
- `.squad/decisions/inbox/kima-content-source-gaps.md` — Primary deliverable (gap analysis)

#### Cross-Agent Findings (from squad sync 2026-03-12)

**Signal gap analysis (Omar):** Content sources alone capture ~85% of blog content but only 40% of overall tech adoption signals. YouTube, podcast, and conference discovery will significantly improve coverage.

**Community discovery (Bunk):** GitHub is fully implemented for community signals but covers only ~20% of real community conversation. Reddit, Stack Overflow, and GitHub Discussions are critical quick wins.

**Architecture recommendation (Freamon):** Implement SourceAdapter pattern before adding 6+ new sources. Current monolithic structure (content.ts, community.ts) needs refactoring for scale.

**Team consensus:** Prioritize Phase 1 (Reddit, Dev.to, Stack Overflow) for immediate editorial value; Phase 2 (YouTube, podcasts) adds creator/influencer coverage; Phase 3 (social, conferences) is secondary.
