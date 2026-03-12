/**
 * RSSSourceAdapter — RSS feed discovery implementation.
 * Extracted from content.ts with no functional changes.
 */

import RssParser from 'rss-parser';
import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, isAspireRelated, isExcluded, truncate } from './helpers.js';

const RSS_FEEDS: readonly { url: string; channel: Channel; name: string }[] = [
  { url: 'https://devblogs.microsoft.com/dotnet/feed/', channel: 'personal_blog', name: '.NET Blog' },
  { url: 'https://devblogs.microsoft.com/aspnet/feed/', channel: 'personal_blog', name: 'ASP.NET Blog' },
  { url: 'https://dev.to/feed/tag/dotnetaspire', channel: 'devto', name: 'Dev.to #dotnetaspire' },
  { url: 'https://dev.to/feed/tag/aspire', channel: 'devto', name: 'Dev.to #aspire' },
] as const;

export class RSSSourceAdapter implements SourceAdapter {
  readonly name = 'rss-feeds';
  readonly displayName = 'RSS Feeds';
  readonly channel: Channel = 'rss';

  async validate(): Promise<AdapterValidation> {
    if (RSS_FEEDS.length === 0) {
      return { valid: false, reason: 'No RSS feeds configured' };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
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

          if (pubDate && pubDate < sinceDate) continue;

          const title = entry.title ?? 'Untitled';
          const url = entry.link ?? '';
          if (!url) continue;

          const text = `${title} ${entry.contentSnippet ?? ''} ${entry.content ?? ''}`.toLowerCase();
          if (!isAspireRelated(text)) continue;
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
}

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
