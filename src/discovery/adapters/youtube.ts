/**
 * YouTubeSourceAdapter — YouTube discovery implementation.
 * Fetches videos from YouTube Data API v3 with two-step discovery:
 * 1. Search for videos matching Aspire-related queries
 * 2. Fetch detailed statistics for matched videos
 */

import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState, Signal } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, isExcluded, truncate } from './helpers.js';

const SEARCH_QUERIES: readonly string[] = ['dotnet aspire', '.net aspire', 'aspire dotnet'] as const;

const SEARCH_API = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_API = 'https://www.googleapis.com/youtube/v3/videos';

const QUOTA_LIMIT = 10000;
const QUOTA_WARNING_THRESHOLD = 0.8;

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeVideosResponse {
  items: YouTubeVideoItem[];
}

export class YouTubeSourceAdapter implements SourceAdapter {
  readonly name = 'youtube';
  readonly displayName = 'YouTube';
  readonly channel: Channel = 'youtube';

  private quotaUsed = 0;

  async validate(): Promise<AdapterValidation> {
    if (!process.env['YOUTUBE_API_KEY']) {
      return { valid: false, reason: 'YOUTUBE_API_KEY environment variable required' };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const apiKey = process.env['YOUTUBE_API_KEY']!;
    const results: DiscoveryResult[] = [];
    const sinceDate = new Date(state.last_run);
    const videoIds = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      try {
        console.log(`  📡 Searching YouTube: "${query}"`);

        const publishedAfter = sinceDate.toISOString();
        const searchUrl = `${SEARCH_API}?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=50&order=date&publishedAfter=${publishedAfter}`;

        const searchResponse = await fetch(searchUrl);
        this.quotaUsed += 100;

        if (!searchResponse.ok) {
          if (searchResponse.status === 403) {
            console.warn(`  ⚠️  YouTube quota exceeded (${this.quotaUsed}/${QUOTA_LIMIT} units used)`);
            break;
          }
          console.warn(`  ⚠️  YouTube search failed: ${searchResponse.status}`);
          continue;
        }

        const searchData = (await searchResponse.json()) as YouTubeSearchResponse;

        for (const item of searchData.items ?? []) {
          if (item.id?.videoId) {
            videoIds.add(item.id.videoId);
          }
        }

        this.checkQuota();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  YouTube search "${query}" failed: ${message}`);
      }
    }

    if (videoIds.size === 0) {
      return results;
    }

    const videoIdArray = Array.from(videoIds);
    const items: ContentItem[] = [];

    for (let i = 0; i < videoIdArray.length; i += 50) {
      const batch = videoIdArray.slice(i, i + 50);
      const videoIds = batch.join(',');

      try {
        const videosUrl = `${VIDEOS_API}?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;

        const videosResponse = await fetch(videosUrl);
        this.quotaUsed += 1;

        if (!videosResponse.ok) {
          if (videosResponse.status === 403) {
            console.warn(`  ⚠️  YouTube quota exceeded (${this.quotaUsed}/${QUOTA_LIMIT} units used)`);
            break;
          }
          console.warn(`  ⚠️  YouTube videos API failed: ${videosResponse.status}`);
          continue;
        }

        const videosData = (await videosResponse.json()) as YouTubeVideosResponse;

        for (const video of videosData.items ?? []) {
          const title = video.snippet.title;
          const description = video.snippet.description ?? '';
          const text = `${title} ${description}`.toLowerCase();

          if (isExcluded(text)) continue;

          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
          const canonicalId = generateCanonicalId(
            title,
            videoUrl,
            video.snippet.channelTitle,
            video.snippet.publishedAt,
          );

          items.push({
            canonical_id: canonicalId,
            title,
            url: videoUrl,
            type: 'video' as ContentType,
            channel: 'youtube',
            published_at: video.snippet.publishedAt,
            author: video.snippet.channelTitle,
            summary: truncate(description, 300),
            tags: {
              topic: extractTopics(text),
              audience: ['intermediate'],
              signal: inferYouTubeSignal(title, description),
              confidence: 'medium',
              actionability: 'investigate',
            },
            provenance: {
              discovered_from: 'youtube:search',
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

        this.checkQuota();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  YouTube videos fetch failed: ${message}`);
      }
    }

    if (items.length > 0) {
      results.push({ items, source: 'youtube:search' });
    }

    console.log(`  ✓ YouTube discovered ${items.length} videos (quota: ${this.quotaUsed}/${QUOTA_LIMIT} units)`);

    return results;
  }

  private checkQuota(): void {
    if (this.quotaUsed >= QUOTA_LIMIT * QUOTA_WARNING_THRESHOLD) {
      console.warn(`  ⚠️  YouTube quota warning: ${this.quotaUsed}/${QUOTA_LIMIT} units used (${Math.round((this.quotaUsed / QUOTA_LIMIT) * 100)}%)`);
    }
  }
}

function inferYouTubeSignal(title: string, description: string): Signal[] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('release') || text.includes('announcement') || text.includes('new version')) return ['release'];
  if (text.includes('tutorial') || text.includes('how to') || text.includes('guide') || text.includes('demo')) return ['tutorial'];
  if (text.includes('getting started') || text.includes('introduction') || text.includes('intro to')) return ['tutorial'];
  if (text.includes('issue') || text.includes('problem') || text.includes('error') || text.includes('bug')) return ['complaint'];
  if (text.includes('feature') || text.includes('new in')) return ['release'];
  if (text.includes('deploy') || text.includes('production') || text.includes('using aspire')) return ['adoption'];

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
    azure: ['azure'],
    aws: ['aws'],
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
