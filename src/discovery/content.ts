/**
 * Content discovery module — RSS feeds, blog search, YouTube search.
 *
 * Implements the discovery strategy from ACCES.md §6.
 * RSS parsing is fully implemented; other sources are skeletons
 * for Kima and the rest of the scouts to fill in.
 */

import RssParser from 'rss-parser';
import { createHash } from 'node:crypto';
import type {
  ContentItem,
  ContentType,
  Channel,
  DiscoveryResult,
  RunState,
} from '../types.js';

// ─── ACCES.md §6 keyword lists ─────────────────────────────────────────────

/** Primary search keywords for Aspire content discovery */
export const SEARCH_KEYWORDS: readonly string[] = [
  'Aspire dev',
  'Aspire 9',
  'Aspire 9.1',
  'Aspire 9.2',
  'Aspire 9.3',
  'Aspirified',
  'Aspire AppHost',
  'Aspire dashboard',
  'Aspire manifest',
  'Aspire service discovery',
  'Aspire .NET',
  'Aspire dotnet',
  'Aspire C#',
  'Aspire csharp',
  'Aspire CLI',
  'Aspire javascript',
  'Aspire python',
  'Aspire azure',
  'Aspire aws',
  'Aspire deploy',
  'Aspire docker',
  'Aspire distributed',
  'Aspire app',
  'Aspire code',
  'Aspire kubernetes',
  'Aspire aca',
  'Aspire redis',
  'Aspire otel',
] as const;

/** Keywords that indicate a result is NOT about .NET Aspire */
export const EXCLUSION_KEYWORDS: readonly string[] = [
  'aspirelearning',
  'aspiremag',
  'buildinpublic',
  '#openenrollment',
  '#aspirepublicschools',
  '#aspirelosangeles',
] as const;

/** Seed RSS feeds for Aspire-related blogs */
const RSS_FEEDS: readonly { url: string; channel: Channel; name: string }[] = [
  { url: 'https://devblogs.microsoft.com/dotnet/feed/', channel: 'personal_blog', name: '.NET Blog' },
  { url: 'https://devblogs.microsoft.com/aspnet/feed/', channel: 'personal_blog', name: 'ASP.NET Blog' },
  { url: 'https://dev.to/feed/tag/dotnetaspire', channel: 'devto', name: 'Dev.to #dotnetaspire' },
  { url: 'https://dev.to/feed/tag/aspire', channel: 'devto', name: 'Dev.to #aspire' },
] as const;

/**
 * Run all content discovery sources and return combined results.
 */
export async function discoverContent(state: RunState): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = [];

  // RSS feeds — fully implemented
  const rssResults = await discoverFromRssFeeds(state);
  results.push(...rssResults);

  // Blog search — skeleton for future implementation
  const blogResults = await discoverFromBlogSearch(state);
  results.push(...blogResults);

  // YouTube search — skeleton for future implementation
  const youtubeResults = await discoverFromYouTube(state);
  results.push(...youtubeResults);

  return results;
}

// ─── RSS feed discovery (implemented) ───────────────────────────────────────

/**
 * Parse configured RSS feeds and extract Aspire-related items.
 * Filters by last-run timestamp and exclusion keywords.
 */
async function discoverFromRssFeeds(state: RunState): Promise<DiscoveryResult[]> {
  const parser = new RssParser();
  const results: DiscoveryResult[] = [];
  const sinceDate = new Date(state.last_run);

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`  📡 Fetching RSS: ${feed.name}`);
      const parsed = await parser.parseURL(feed.url);

      const items: ContentItem[] = [];
      for (const entry of parsed.items ?? []) {
        const pubDate = entry.pubDate ? new Date(entry.pubDate) : null;

        // Skip items older than last run
        if (pubDate && pubDate < sinceDate) continue;

        const title = entry.title ?? 'Untitled';
        const url = entry.link ?? '';
        if (!url) continue;

        // Check relevance — must mention aspire or related terms
        const text = `${title} ${entry.contentSnippet ?? ''} ${entry.content ?? ''}`.toLowerCase();
        if (!isAspireRelated(text)) continue;

        // Check exclusion list
        if (isExcluded(text)) continue;

        const canonicalId = generateCanonicalId(title, url, entry.creator ?? null, entry.pubDate ?? null);

        items.push({
          canonical_id: canonicalId,
          title,
          url,
          type: inferContentType(url, text),
          channel: feed.channel,
          published_at: entry.pubDate ?? null,
          author: entry.creator ?? entry['dc:creator'] as string ?? null,
          summary: truncate(entry.contentSnippet ?? '', 300),
          tags: {
            topic: extractTopics(text),
            audience: ['intermediate'],
            signal: ['other'],
            confidence: 'medium',
            actionability: 'investigate',
          },
          provenance: {
            discovered_from: `rss:${feed.name}`,
            discovered_query: null,
            source_first_seen: new Date().toISOString(),
            raw_evidence_path: null,
          },
          dedupe: {
            is_duplicate: false,
            duplicate_of: null,
            duplicate_reason: null,
          },
        });
      }

      if (items.length > 0) {
        results.push({ items, source: `rss:${feed.name}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠️  RSS feed ${feed.name} failed: ${message}`);
    }
  }

  return results;
}

// ─── Blog search (skeleton) ─────────────────────────────────────────────────

/**
 * Search blog platforms for Aspire content.
 * TODO: Implement Dev.to API search, Medium search, Substack discovery.
 */
async function discoverFromBlogSearch(_state: RunState): Promise<DiscoveryResult[]> {
  // Skeleton — Kima and blog scouts will implement
  console.log('  📝 Blog search: not yet implemented (skeleton)');
  return [];
}

// ─── YouTube search (skeleton) ───────────────────────────────────────────────

/**
 * Search YouTube for Aspire-related videos.
 * TODO: Implement YouTube Data API v3 search with SEARCH_KEYWORDS.
 */
async function discoverFromYouTube(_state: RunState): Promise<DiscoveryResult[]> {
  // Skeleton — video scout will implement
  console.log('  🎥 YouTube search: not yet implemented (skeleton)');
  return [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check if text is Aspire-related using keyword heuristics */
function isAspireRelated(text: string): boolean {
  const lower = text.toLowerCase();
  const markers = [
    'aspire', 'apphost', 'aspire dashboard',
    'service discovery', 'aspire manifest',
    '.net aspire', 'dotnet aspire',
  ];
  return markers.some((m) => lower.includes(m));
}

/** Check if text matches exclusion keywords */
function isExcluded(text: string): boolean {
  const lower = text.toLowerCase();
  return EXCLUSION_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

/** Generate a deterministic canonical ID from content attributes */
export function generateCanonicalId(
  title: string,
  url: string,
  author: string | null,
  date: string | null,
): string {
  const input = [title, url, author ?? '', date ?? ''].join('|').toLowerCase();
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Infer content type from URL and text */
function inferContentType(url: string, text: string): ContentType {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
  if (lower.includes('github.com')) {
    if (lower.includes('/releases/')) return 'release';
    if (lower.includes('/issues/')) return 'issue';
    if (lower.includes('/discussions/')) return 'discussion';
    return 'repo';
  }
  if (lower.includes('reddit.com')) return 'reddit';
  if (text.includes('sample') || text.includes('template')) return 'sample';
  return 'blog';
}

/** Extract topic tags from text using keyword matching */
function extractTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    apphost: ['apphost', 'app host'],
    dashboard: ['dashboard'],
    integrations: ['integration'],
    k8s: ['kubernetes', 'k8s'],
    aca: ['azure container app', 'aca'],
    otel: ['opentelemetry', 'otel'],
    postgres: ['postgres', 'postgresql'],
    redis: ['redis'],
    dapr: ['dapr'],
    auth: ['auth', 'authentication', 'identity'],
    caching: ['cache', 'caching'],
    dotnet: ['.net', 'dotnet', 'c#', 'csharp'],
    typescript: ['typescript'],
    python: ['python'],
    docker: ['docker', 'container'],
    deploy: ['deploy', 'deployment'],
  };

  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((k) => lower.includes(k))) {
      found.push(topic);
    }
  }

  return found.length > 0 ? found : ['aspire'];
}

/** Truncate a string to maxLen characters */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
