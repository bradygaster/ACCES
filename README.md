# ACCES — Aspire Community Content Engine

## What is ACCES?

ACCES is your Aspire content discovery engine. It automatically discovers, deduplicates, classifies, and packages everything the community is building and saying about [Aspire](https://aspire.dev/)—blogs, samples, repos, GitHub activity, and more. Run it once or on a regular schedule to get a complete snapshot of what's happening in the Aspire ecosystem, ready for you to read, act on, or share.

## Quick Start

```bash
git clone https://github.com/bradygaster/ACCES.git
cd ACCES
npm install
npm start
```

That's it. One command and you get all 9 report files showing everything new since the last run, next actions, metrics, and more.

## What You Get

Each run produces a timestamped folder with 9 reports (plus supporting files):

| File | What's in it |
|------|-------------|
| `01_new-since-last-run.md` | Everything new since last run, with URLs and recommendations |
| `02_next-actions.md` | Top 5 actions + amplification/response/gap queues |
| `03_month-to-date_rollup.md` | Monthly rollup: themes, creators, pain points, editorial calendar |
| `04_source-ledger.json` | Machine-readable ledger of all discovered items |
| `05_dedupe-map.md` | Which items were merged and why |
| `06_watchlist.md` | Recurring channels/authors/repos and what changed |
| `07_gap-analysis.md` | Content gaps the community needs filled |
| `08_candidate-amplifications.md` | Ready-to-post copy for LinkedIn, X, newsletters |
| `09_metrics.md` | Counts by channel/type, unique authors, trends |

## How It Works

The engine runs a simple pipeline: **discover → dedupe → classify → analyze → output**.

1. **Discover** — Crawl sources for new content
2. **Dedupe** — Merge duplicate items (same content, different URLs)
3. **Classify** — Tag each item with type, topic, audience, signal, and actionability
4. **Analyze** — Build rollups, gap analysis, recommendations
5. **Output** — Generate the 9 reports

## Sources

ACCES currently discovers from:
- **GitHub** — aspire org repos, issues, discussions via GitHub API
- **Blogs** — .NET Blog, ASP.NET Blog, Dev.to (RSS)

Coming soon:
- YouTube, Reddit, social media, conference sites

## Since Last Run

The engine remembers what it's found. State is stored in `AspireContentEngine/.state/`:

- **First run:** Bootstraps from the last 30 days
- **Subsequent runs:** Shows only new items since the last run timestamp
- **Deduplication:** Maintains a canonical map of merged items

This way, you always see what's fresh without re-reading old content.

## Output Location

Reports are saved to `AspireContentEngine/YYYY-MM-DD_HH-mm-ss/`, with a new timestamped folder for each run.

## The Team

ACCES is built by an AI agent squad (The Wire cast, 8 specialists) using the [Squad SDK](https://github.com/bradygaster/squad). See `squad.config.ts` for the team roster.

---

**Ready to go?** Clone, install, and run. Your first report lands in seconds.
