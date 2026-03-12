/**
 * DevToSourceAdapter — Dev.to REST API discovery implementation.
 * Uses public Dev.to API to search articles by tags, with filtering and deduplication.
 */

import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, isAspireRelated, isExcluded, truncate } from './helpers.js';

const DEVTO_API_BASE = 'https://dev.to/api/articles';
const TAGS = ['dotnetaspire', 'aspire', 'dotnet'] as const;
const PER_PAGE = 30;
const MAX_PAGES = 3;
const REQUEST_DELAY_MS = 500;

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  published_at: string;
  tag_list: string[];
  user: {
    username: string;
    name: string;
  };
  public_reactions_count: number;
  comments_count: number;
  reading_time_minutes: number;
}

export class DevToSourceAdapter implements SourceAdapter {
  readonly name = 'devto';
  readonly displayName = 'Dev.to';
  readonly channel: Channel = 'devto';

  async validate(): Promise<AdapterValidation> {
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const sinceDate = new Date(state.last_run);
    const seenUrls = new Set<string>();

    for (const tag of TAGS) {
      try {
        console.log(`  📡 Fetching Dev.to tag: ${tag}`);
        const items: ContentItem[] = [];

        for (let page = 1; page <= MAX_PAGES; page++) {
          const url = `${DEVTO_API_BASE}?tag=${tag}&per_page=${PER_PAGE}&page=${page}`;
          
          const response = await fetch(url);
          if (!response.ok) {
            if (response.status === 429) {
              const retryAfter = response.headers.get('retry-after');
              const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
              console.warn(`  ⏳ Dev.to rate limited, waiting ${waitMs / 1000}s`);
              await sleep(waitMs);
              continue;
            }
            console.warn(`  ⚠️  Dev.to API error for tag ${tag} page ${page}: ${response.status}`);
            break;
          }

          const articles: DevToArticle[] = await response.json();
          if (articles.length === 0) break;

          for (const article of articles) {
            const pubDate = new Date(article.published_at);
            if (pubDate < sinceDate) continue;

            // Dedupe by URL across tags
            if (seenUrls.has(article.url)) continue;

            const text = `${article.title} ${article.description} ${article.tag_list.join(' ')}`;
            
            // Filter by Aspire relevance for broad tags
            if (tag === 'dotnet' || tag === 'aspire') {
              if (!isAspireRelated(text)) continue;
            }

            if (isExcluded(text)) continue;

            seenUrls.add(article.url);

            const canonicalId = generateCanonicalId(
              article.title,
              article.url,
              article.user.username,
              article.published_at,
            );

            items.push({
              canonical_id: canonicalId,
              title: article.title,
              url: article.url,
              type: 'blog' as ContentType,
              channel: 'devto',
              published_at: article.published_at,
              author: article.user.username,
              summary: truncate(article.description || '', 300),
              tags: {
                topic: extractTopics(text),
                audience: ['intermediate'],
                signal: ['adoption'],
                confidence: 'medium',
                actionability: 'investigate',
              },
              provenance: {
                discovered_from: `devto:tag:${tag}`,
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

          // Rate limiting between pages
          if (page < MAX_PAGES) {
            await sleep(REQUEST_DELAY_MS);
          }
        }

        if (items.length > 0) {
          results.push({ items, source: `devto:tag:${tag}` });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Dev.to tag ${tag} failed: ${message}`);
      }

      // Rate limiting between tags
      await sleep(REQUEST_DELAY_MS);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
