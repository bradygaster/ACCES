/**
 * StackOverflowSourceAdapter — Stack Overflow questions discovery.
 * Uses Stack Exchange API v2.3 to discover Aspire-related questions.
 */

import { gunzipSync } from 'node:zlib';
import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState, Signal } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, truncate } from './helpers.js';

const STACKOVERFLOW_API_BASE = 'https://api.stackexchange.com/2.3/questions';
const ASPIRE_TAGS = ['dotnet-aspire', '.net-aspire'];

interface StackOverflowQuestion {
  title: string;
  link: string;
  owner?: { display_name?: string };
  score: number;
  answer_count: number;
  view_count: number;
  creation_date: number;
  tags: string[];
  is_answered: boolean;
}

interface StackOverflowResponse {
  items: StackOverflowQuestion[];
  has_more: boolean;
  quota_remaining: number;
  backoff?: number;
}

export class StackOverflowSourceAdapter implements SourceAdapter {
  readonly name = 'stackoverflow';
  readonly displayName = 'Stack Overflow';
  readonly channel: Channel = 'stackoverflow';

  async validate(): Promise<AdapterValidation> {
    const apiKey = process.env['STACKOVERFLOW_API_KEY'];
    if (!apiKey) {
      return {
        valid: true,
        warnings: ['STACKOVERFLOW_API_KEY not set — using unauthenticated API (300 req/day limit)'],
      };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];
    const sinceDate = new Date(state.last_run);
    const fromDate = Math.floor(sinceDate.getTime() / 1000);

    for (const tag of ASPIRE_TAGS) {
      try {
        console.log(`  🔍 Fetching Stack Overflow tag: ${tag}`);
        const items = await this.fetchQuestions(tag, fromDate);

        if (items.length > 0) {
          results.push({
            items,
            source: `stackoverflow:${tag}`,
            query: tag,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  Stack Overflow tag ${tag} failed: ${message}`);
      }
    }

    return results;
  }

  private async fetchQuestions(tag: string, fromDate: number): Promise<ContentItem[]> {
    const apiKey = process.env['STACKOVERFLOW_API_KEY'];
    const params = new URLSearchParams({
      tagged: tag,
      site: 'stackoverflow',
      sort: 'creation',
      order: 'desc',
      pagesize: '100',
      fromdate: fromDate.toString(),
    });

    if (apiKey) {
      params.set('key', apiKey);
    }

    const url = `${STACKOVERFLOW_API_BASE}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stack Overflow API returned ${response.status}: ${response.statusText}`);
    }

    const data = await this.decompressResponse(response);

    if (data.backoff) {
      console.warn(`  ⏳ Stack Overflow API requested backoff: ${data.backoff}s`);
      await this.sleep(data.backoff * 1000);
    }

    if (data.quota_remaining !== undefined) {
      console.log(`  📊 Quota remaining: ${data.quota_remaining}`);
    }

    return data.items.map((item) => this.mapToContentItem(item, tag));
  }

  private async decompressResponse(response: Response): Promise<StackOverflowResponse> {
    const buffer = await response.arrayBuffer();
    const decompressed = gunzipSync(Buffer.from(buffer));
    return JSON.parse(decompressed.toString('utf-8'));
  }

  private mapToContentItem(item: StackOverflowQuestion, tag: string): ContentItem {
    const title = this.decodeHtmlEntities(item.title);
    const author = item.owner?.display_name ?? null;
    const publishedAt = new Date(item.creation_date * 1000).toISOString();

    const canonicalId = generateCanonicalId(title, item.link, author, publishedAt);

    return {
      canonical_id: canonicalId,
      title,
      url: item.link,
      type: 'discussion' as ContentType,
      channel: 'stackoverflow',
      published_at: publishedAt,
      author,
      summary: truncate(title, 300),
      tags: {
        topic: this.mapSOTags(item.tags),
        audience: ['intermediate'],
        signal: this.inferSOSignal(item),
        confidence: 'medium',
        actionability: item.is_answered ? 'investigate' : 'respond',
      },
      provenance: {
        discovered_from: 'stackoverflow:questions',
        discovered_query: tag,
        source_first_seen: new Date().toISOString(),
        raw_evidence_path: null,
      },
      dedupe: {
        is_duplicate: false,
        duplicate_of: null,
        duplicate_reason: null,
      },
    };
  }

  private mapSOTags(tags: string[]): string[] {
    const topicMap: Record<string, string> = {
      'dotnet-aspire': 'aspire',
      '.net-aspire': 'aspire',
      'c#': 'dotnet',
      '.net': 'dotnet',
      'dotnet': 'dotnet',
      'azure': 'azure',
      'kubernetes': 'k8s',
      'docker': 'docker',
      'redis': 'redis',
      'postgresql': 'postgres',
      'postgres': 'postgres',
      'opentelemetry': 'otel',
      'authentication': 'auth',
      'caching': 'caching',
      'deployment': 'deploy',
    };

    const mapped = tags
      .map((tag) => topicMap[tag.toLowerCase()] ?? null)
      .filter((t): t is string => t !== null);

    return mapped.length > 0 ? [...new Set(mapped)] : ['aspire'];
  }

  private inferSOSignal(item: StackOverflowQuestion): Signal[] {
    const signals: Signal[] = [];

    if (!item.is_answered && item.answer_count === 0) {
      signals.push('confusion');
    }

    if (item.score >= 5) {
      signals.push('adoption');
    }

    if (item.score < 0) {
      signals.push('complaint');
    }

    if (item.view_count > 100) {
      signals.push('adoption');
    }

    return signals.length > 0 ? signals : ['other'];
  }

  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&#x27;': "'",
      '&apos;': "'",
    };

    return text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] ?? match);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
