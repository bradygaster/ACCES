# ACCES — Aspire Community Content Engine Squad

An on-demand content discovery engine that finds, deduplicates, classifies, and packages **everything the community ships or says about [Aspire](https://aspire.dev/)** — blogs, samples, repos, videos, podcasts, talks, articles, social posts, GitHub activity, and more.

## What It Does

ACCES runs as a "daily engine" on your machine. Each run produces a **timestamped folder** with:

| File | What's Inside |
|------|---------------|
| `01_new-since-last-run.md` | Everything discovered since the last run, with URLs and summaries |
| `02_next-actions.md` | Recommended actions: amplify, respond, follow-up, outreach |
| `03_month-to-date_rollup.md` | Monthly summary: top items, themes, notable contributors, sentiment |
| `04_source-ledger.json` | Machine-readable ledger of all discovered items with full metadata |
| `05_dedupe-map.md` | Which items were merged and why |
| `06_watchlist.md` | Recurring channels/authors/repos and what changed |
| `07_gap-analysis.md` | What's missing: themes, channels, unanswered questions, docs gaps |
| `08_candidate-amplifications.md` | Ready-to-post copy for LinkedIn, X, newsletters (with citations) |
| `09_metrics.md` | Counts by channel/type, unique authors, top topics, trends vs last run |

Plus subfolders: `/raw/` (raw captures), `/triage/` (needs manual review), `/assets/` (thumbnails/logos).

## Quick Start

```bash
# Clone the repo
git clone https://github.com/bradygaster/ACCES.git
cd ACCES

# Install dependencies
npm install

# Run the engine
npm start
```

Output goes to `AspireContentEngine/YYYY-MM-DD_HH-mm-ss/`.

## How It Works

ACCES discovers content across multiple source families:

- **Blogs & Articles** — RSS feeds, Medium, Substack, Dev.to, personal blogs
- **Video & Audio** — YouTube, Twitch, podcasts
- **GitHub** — repos, releases, PRs, issues, discussions
- **Social & Community** — Reddit, X, LinkedIn, Bluesky
- **Conferences** — session listings, recordings
- **Official Channels** — Microsoft docs blog, .NET blog (as baseline)

Every item is classified with a rich taxonomy:

- **Type:** blog, video, sample, repo, release, talk, podcast, etc.
- **Topic:** apphost, dashboard, integrations, k8s, otel, redis, dapr, etc.
- **Audience:** beginner, intermediate, advanced, decision-maker
- **Signal:** adoption, confusion, praise, complaint, request, tutorial
- **Confidence:** high, medium, low
- **Actionability:** amplify, respond, ignore, follow-up, investigate

## "Since Last Run" State

ACCES remembers what it's already found. State is stored in `AspireContentEngine/.state/`:

- Last run timestamp
- Canonical IDs/URLs already reported
- Known duplicates (canonical mapping)

First run bootstraps from the last 30 days.

## What Counts as "Aspire-Related"

An item qualifies if it:

- Uses or teaches Aspire explicitly
- References Aspire components (AppHost, Dashboard, service discovery, manifest, integrations)
- Is a sample, extension, template, or tool framed around Aspire
- Is a community contribution to aspire repos or community toolkit
- Is community Q&A signaling adoption, confusion, or feature requests
- Is "Aspire + X" content (Aspire + .NET, TypeScript, Python, Agents, Dapr, ACA, Kubernetes, etc.)

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js
- **Configuration:** `squad.config.ts` (Squad SDK)

## Contributing

This project uses [Squad](https://github.com/bradygaster/squad) for AI-assisted development. See `.squad/team.md` for the team roster.

## License

MIT
