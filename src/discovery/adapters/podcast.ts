/**
 * PodcastSourceAdapter — Podcast RSS feed discovery implementation.
 * Discovers .NET Aspire mentions in podcast episodes from curated feeds.
 */

import RssParser from 'rss-parser';
import type { Channel, ContentItem, DiscoveryResult, RunState } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, isAspireRelated, isExcluded, truncate } from './helpers.js';

const PODCAST_FEEDS: readonly { url: string; name: string }[] = [
  { url: 'https://www.dotnetrocks.com/feed', name: '.NET Rocks' },
  { url: 'https://feeds.simplecast.com/gvtxUiIf', name: 'Hanselminutes' },
  { url: 'https://thedotnetcorepodcast.libsyn.com/rss', name: 'The .NET Core Podcast' },
  { url: 'https://www.codingblocks.net/feed/podcast', name: 'Coding Blocks' },
  { url: 'https://6figuredev.com/feed/podcast', name: 'The 6 Figure Developer' },
  { url: 'https://feeds.simplecast.com/GDyuEEo6', name: 'Adventures in .NET' },
] as const;

export class PodcastSourceAdapter implements SourceAdapter {
  readonly name = 'podcasts';
  readonly displayName = 'Podcasts';
  readonly channel: Channel = 'podcast';

  async validate(): Promise<AdapterValidation> {
    if (PODCAST_FEEDS.length === 0) {
      return { valid: false, reason: 'No podcast feeds configured' };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const parser = new RssParser();
    const results: DiscoveryResult[] = [];
    const sinceDate = new Date(state.last_run);

    for (const feed of PODCAST_FEEDS) {
      try {
        console.log(`  🎙️  Fetching Podcast: ${feed.name}`);
        const parsed = await parser.parseURL(feed.url);

        const items: ContentItem[] = [];
        for (const entry of parsed.items ?? []) {
          const pubDate = entry.pubDate ? new Date(entry.pubDate) : null;

          if (pubDate && pubDate < sinceDate) continue;

          const title = entry.title ?? 'Untitled Episode';
          const url = entry.link ?? entry.enclosure?.url ?? '';
          if (!url) continue;

          const text = `${title} ${entry.contentSnippet ?? ''} ${entry.content ?? ''}`.toLowerCase();
          if (!isAspireRelated(text)) continue;
          if (isExcluded(text)) continue;

          const canonicalId = generateCanonicalId(title, url, feed.name, entry.pubDate ?? null);

          items.push({
            canonical_id: canonicalId,
            title,
            url,
            type: 'blog',
            channel: 'podcast',
            published_at: entry.pubDate ?? null,
            author: feed.name,
            summary: truncate(entry.contentSnippet ?? '', 300),
            tags: {
              topic: extractTopics(text),
              audience: ['intermediate'],
              signal: ['adoption'],
              confidence: 'medium',
              actionability: 'investigate',
            },
            provenance: {
              discovered_from: `podcast:${feed.name}`,
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
          results.push({ items, source: `podcast:${feed.name}` });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Podcast feed ${feed.name} failed: ${message}`);
      }
    }

    return results;
  }
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
