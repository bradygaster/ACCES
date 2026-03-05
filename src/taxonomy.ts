/**
 * Taxonomy module — classification and deduplication.
 *
 * Implements canonical ID generation, URL similarity, and
 * keyword-based classification for type/channel/topic.
 */

import { createHash } from 'node:crypto';
import type {
  Audience,
  Channel,
  ClassifiedItem,
  Confidence,
  ContentItem,
  ContentType,
  Signal,
  Actionability,
} from './types.js';

/**
 * Classify a batch of content items by filling in taxonomy tags.
 * Uses keyword heuristics against title + summary + URL.
 */
export function classify(items: ContentItem[]): ClassifiedItem[] {
  return items.map((item) => {
    const text = `${item.title} ${item.summary} ${item.url}`.toLowerCase();
    return {
      ...item,
      type: classifyType(item.url, text, item.type),
      channel: classifyChannel(item.url, item.channel),
      tags: {
        topic: classifyTopics(text),
        audience: classifyAudience(text),
        signal: classifySignal(text),
        confidence: classifyConfidence(text),
        actionability: classifyActionability(text),
      },
    };
  });
}

/**
 * Deduplicate items by canonical ID and URL similarity.
 * Returns unique items and a map of duplicate→original canonical IDs.
 */
export function deduplicate(
  items: ContentItem[],
): { unique: ContentItem[]; dupes: Map<string, string> } {
  const seen = new Map<string, ContentItem>();
  const urlIndex = new Map<string, string>(); // normalized URL → canonical_id
  const dupes = new Map<string, string>();

  for (const item of items) {
    // Check exact canonical_id match
    if (seen.has(item.canonical_id)) {
      markDuplicate(item, item.canonical_id, 'identical canonical_id');
      dupes.set(item.canonical_id, item.canonical_id);
      continue;
    }

    // Check URL similarity
    const normalizedUrl = normalizeUrl(item.url);
    const existingId = urlIndex.get(normalizedUrl);
    if (existingId) {
      markDuplicate(item, existingId, 'same normalized URL');
      dupes.set(item.canonical_id, existingId);
      continue;
    }

    // Check title similarity against existing items
    const titleMatch = findSimilarTitle(item.title, [...seen.values()]);
    if (titleMatch) {
      markDuplicate(item, titleMatch.canonical_id, 'similar title');
      dupes.set(item.canonical_id, titleMatch.canonical_id);
      continue;
    }

    seen.set(item.canonical_id, item);
    urlIndex.set(normalizedUrl, item.canonical_id);
  }

  return { unique: [...seen.values()], dupes };
}

/**
 * Generate a canonical ID by hashing title + url + author + date.
 */
export function generateCanonicalId(
  title: string,
  url: string,
  author: string | null,
  date: string | null,
): string {
  const input = [title, url, author ?? '', date ?? ''].join('|').toLowerCase();
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

// ─── Classification helpers ─────────────────────────────────────────────────

function classifyType(url: string, text: string, fallback: ContentType): ContentType {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
  if (lower.includes('github.com')) {
    if (lower.includes('/releases/')) return 'release';
    if (lower.includes('/issues/')) return 'issue';
    if (lower.includes('/discussions/')) return 'discussion';
    if (text.includes('sample') || text.includes('template')) return 'sample';
    return 'repo';
  }
  if (lower.includes('reddit.com')) return 'reddit';
  if (lower.includes('dev.to') || lower.includes('medium.com') || lower.includes('substack.com')) return 'blog';
  if (text.includes('podcast') || text.includes('episode')) return 'podcast';
  if (text.includes('talk') || text.includes('conference') || text.includes('session')) return 'talk';
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to')) return 'article';
  return fallback;
}

function classifyChannel(url: string, fallback: Channel): Channel {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('reddit.com')) return 'reddit';
  if (lower.includes('dev.to')) return 'devto';
  if (lower.includes('medium.com')) return 'medium';
  if (lower.includes('substack.com')) return 'substack';
  if (lower.includes('linkedin.com')) return 'linkedin';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'X';
  if (lower.includes('bsky.app')) return 'bluesky';
  return fallback;
}

function classifyTopics(text: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    apphost: ['apphost', 'app host', 'app-host'],
    dashboard: ['dashboard'],
    integrations: ['integration'],
    k8s: ['kubernetes', 'k8s'],
    aca: ['azure container app', 'aca'],
    otel: ['opentelemetry', 'otel', 'telemetry'],
    postgres: ['postgres', 'postgresql'],
    redis: ['redis'],
    dapr: ['dapr'],
    auth: ['auth', 'authentication', 'identity'],
    caching: ['cache', 'caching'],
    dotnet: ['.net', 'dotnet', 'c#', 'csharp'],
    typescript: ['typescript'],
    python: ['python'],
    docker: ['docker', 'container'],
    deploy: ['deploy', 'deployment', 'ci/cd'],
    testing: ['test', 'testing', 'xunit', 'nunit'],
  };

  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some((k) => text.includes(k))) {
      found.push(topic);
    }
  }
  return found.length > 0 ? found : ['aspire'];
}

function classifyAudience(text: string): Audience[] {
  const audiences: Audience[] = [];
  if (text.includes('getting started') || text.includes('beginner') || text.includes('introduction')) {
    audiences.push('beginner');
  }
  if (text.includes('advanced') || text.includes('deep dive') || text.includes('architecture')) {
    audiences.push('advanced');
  }
  if (text.includes('decision') || text.includes('comparison') || text.includes('why ')) {
    audiences.push('decision-maker');
  }
  if (text.includes('contribute') || text.includes('maintainer') || text.includes('community')) {
    audiences.push('community-maintainer');
  }
  return audiences.length > 0 ? audiences : ['intermediate'];
}

function classifySignal(text: string): Signal[] {
  const signals: Signal[] = [];
  if (text.includes('bug') || text.includes('error') || text.includes('broken')) signals.push('complaint');
  if (text.includes('love') || text.includes('great') || text.includes('awesome')) signals.push('praise');
  if (text.includes('confused') || text.includes("doesn't work") || text.includes('how do i')) signals.push('confusion');
  if (text.includes('feature request') || text.includes('please add') || text.includes('wish')) signals.push('request');
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to')) signals.push('tutorial');
  if (text.includes('release') || text.includes('version') || text.includes('update')) signals.push('release');
  if (text.includes('adopt') || text.includes('migrat') || text.includes('switch')) signals.push('adoption');
  if (text.includes('vulnerab') || text.includes('cve') || text.includes('security')) signals.push('vulnerability');
  return signals.length > 0 ? signals : ['other'];
}

function classifyConfidence(text: string): Confidence {
  // High confidence: explicitly mentions "aspire" with .NET/dotnet context
  if (text.includes('aspire') && (text.includes('.net') || text.includes('dotnet') || text.includes('apphost'))) {
    return 'high';
  }
  // Medium: mentions aspire
  if (text.includes('aspire')) return 'medium';
  // Low: tangential matches
  return 'low';
}

function classifyActionability(text: string): Actionability {
  if (text.includes('tutorial') || text.includes('great') || text.includes('awesome')) return 'amplify';
  if (text.includes('bug') || text.includes('help') || text.includes('question')) return 'respond';
  if (text.includes('feature request') || text.includes('wish')) return 'follow-up';
  if (text.includes('vulnerab') || text.includes('security')) return 'investigate';
  return 'ignore';
}

// ─── Deduplication helpers ──────────────────────────────────────────────────

/** Normalize a URL for comparison (strip protocol, www, trailing slash, query params) */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '');
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

/** Find an item with a very similar title (>80% character overlap) */
function findSimilarTitle(title: string, existing: ContentItem[]): ContentItem | null {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (normalizedTitle.length < 10) return null; // Too short to compare meaningfully

  for (const item of existing) {
    const existingNormalized = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (similarity(normalizedTitle, existingNormalized) > 0.8) {
      return item;
    }
  }
  return null;
}

/** Simple character-level Jaccard similarity */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/** Mark an item as a duplicate in-place */
function markDuplicate(item: ContentItem, originalId: string, reason: string): void {
  item.dedupe = {
    is_duplicate: true,
    duplicate_of: originalId,
    duplicate_reason: reason,
  };
}
