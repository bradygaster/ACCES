/**
 * RedditSourceAdapter — Reddit discovery implementation.
 * Fetches posts from specified subreddits using Reddit's public JSON API.
 */

import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState, Signal } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, isAspireRelated, isExcluded, truncate } from './helpers.js';

const SUBREDDITS: readonly string[] = ['dotnet', 'csharp', 'programming', 'aspnetcore'] as const;

const USER_AGENT = 'ACCES-ContentEngine/1.0 (Community Source Scout for .NET Aspire)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RedditPost {
  data: {
    title: string;
    author: string;
    subreddit: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    selftext: string;
    url: string;
    is_self: boolean;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

export class RedditSourceAdapter implements SourceAdapter {
  readonly name = 'reddit';
  readonly displayName = 'Reddit';
  readonly channel: Channel = 'reddit';

  async validate(): Promise<AdapterValidation> {
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const sinceDate = new Date(state.last_run);

    for (const subreddit of SUBREDDITS) {
      try {
        console.log(`  📡 Fetching Reddit: r/${subreddit}`);
        
        const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=100`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENT,
          },
        });

        if (!response.ok) {
          console.warn(`  ⚠️  Reddit r/${subreddit} returned ${response.status}`);
          continue;
        }

        const data = (await response.json()) as RedditResponse;
        const items: ContentItem[] = [];

        for (const post of data.data.children ?? []) {
          const postData = post.data;

          if (!postData.title || postData.author === '[deleted]') continue;

          const publishedDate = new Date(postData.created_utc * 1000);
          if (publishedDate < sinceDate) continue;

          const title = postData.title;
          const selftext = postData.selftext || '';
          const text = `${title} ${selftext}`.toLowerCase();

          if (!isAspireRelated(text)) continue;
          if (isExcluded(text)) continue;

          const canonicalId = generateCanonicalId(
            title,
            postData.permalink,
            postData.author,
            postData.created_utc.toString(),
          );

          const redditUrl = `https://www.reddit.com${postData.permalink}`;

          items.push({
            canonical_id: canonicalId,
            title,
            url: redditUrl,
            type: 'reddit' as ContentType,
            channel: 'reddit',
            published_at: publishedDate.toISOString(),
            author: postData.author,
            summary: truncate(selftext || title, 300),
            tags: {
              topic: extractTopics(text),
              audience: ['intermediate'],
              signal: inferRedditSignal(title, selftext, postData.score),
              confidence: 'medium',
              actionability: 'investigate',
            },
            provenance: {
              discovered_from: `reddit:r/${subreddit}`,
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
          results.push({ items, source: `reddit:r/${subreddit}` });
        }

        await sleep(1000);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Reddit r/${subreddit} failed: ${message}`);
      }
    }

    return results;
  }
}

function inferRedditSignal(title: string, body: string, score: number): Signal[] {
  const text = `${title} ${body}`.toLowerCase();

  if (text.includes('release') || text.includes('announcement')) return ['release'];
  if (text.includes('vulnerability') || text.includes('security')) return ['vulnerability'];
  if (text.includes('tutorial') || text.includes('how to') || text.includes('guide')) return ['tutorial'];
  if (text.includes('question') || text.includes('help') || text.includes('confused')) return ['confusion'];
  if (text.includes('issue') || text.includes('problem') || text.includes('bug')) return ['complaint'];
  if (text.includes('feature request') || text.includes('would be nice')) return ['request'];
  if (score > 50 || text.includes('love') || text.includes('amazing') || text.includes('great')) return ['praise'];
  if (text.includes('using') || text.includes('deployed') || text.includes('migrated')) return ['adoption'];

  return ['other'];
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
