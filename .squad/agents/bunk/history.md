# Bunk — History

## Project Context

- **Project:** ACCES — Aspire Community Content Engine Squad
- **Stack:** TypeScript, Node.js, Squad SDK, Copilot SDK
- **Owner:** bradygaster (Brady), with Beth Massi as the primary customer/user
- **Purpose:** Discover Aspire-related community activity from GitHub, Reddit, social platforms, and discussion forums
- **Source families:** GitHub (repos/releases/PRs/issues/discussions), Reddit, X/LinkedIn, Bluesky, community Q&A

## Learnings

- First session: team initialized 2026-03-05
- **Reddit JSON API:** Requires User-Agent header, respects X-RateLimit headers, returns 1 request per 2 seconds (~30 requests/min)
- **Stack Overflow API:** 300 req/day free (10k with key); `/search/advanced.json` is the query endpoint; timestamps are Unix epoch
- **Bluesky atproto:** Fully open, no auth required, generous rate limits, standard REST API at https://public.api.bsky.app/xrpc
- **Mastodon:** Instance-specific APIs, typically `/api/v1/timelines/tag/{hashtag}`, HTML-escaped content requires unescaping
- **X/Twitter:** API is now paid (formerly free); Elevated tier ~$5k/month; low ROI for Aspire discovery (high noise)
- **Discord:** Requires bot setup + human server admin approval; historical message API is paginated (100 messages per call)
- **GitHub Discussions:** Supported by REST API, separate from Issues, not yet queried in community.ts
- **Canonical IDs:** Team uses sha256(id+url+author+date), hex 16 chars; ensures deterministic dedupe
- **Community source priority:** Reddit > Stack Overflow > GitHub Discussions (quick wins); defer X/LinkedIn/Discord until budget/access confirmed

#### Cross-Agent Findings (from squad sync 2026-03-12)

**Signal gap analysis (Omar):** Reddit is critical for real-time pain signals and adoption friction detection. Stack Overflow captures eternal pain patterns that inform content strategy. Together, these unlock medium-term editorial intelligence.

**Content discovery (Kima):** RSS feeds are lowest-friction source; blog platforms via API add engagement metrics. Multi-source deduplication is critical. Recommend implementing Dev.to API alongside Reddit and Stack Overflow.

**Architecture recommendation (Freamon):** Design community sources as SourceAdapter modules. Each source (GitHub, Reddit, Stack Overflow, etc.) becomes self-contained with its own rate limiting, error handling, and validation.

**Team consensus:** Phase 1 (Reddit + Stack Overflow + Dev.to) gives Beth 50% signal completeness. Phase 2 (YouTube) adds creator mapping. Phase 3 deferred until early wins stabilized.
