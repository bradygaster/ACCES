/**
 * Signal analysis module.
 *
 * Turns the classified corpus into trends, gaps, and amplification candidates.
 */

import type {
  Amplification,
  AnalysisResult,
  ClassifiedItem,
  Gap,
  Metrics,
  RunState,
  Trend,
} from './types.js';

/**
 * Analyze classified items and produce trends, gaps, amplifications, and metrics.
 */
export function analyze(items: ClassifiedItem[], state: RunState): AnalysisResult {
  const metrics = computeMetrics(items, state);
  const trends = computeTrends(items, state);
  const gaps = identifyGaps(items);
  const amplifications = generateAmplifications(items);

  return { trends, gaps, amplifications, metrics };
}

// ─── Metrics ────────────────────────────────────────────────────────────────

function computeMetrics(items: ClassifiedItem[], state: RunState): Metrics {
  const byChannel: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const bySignal: Record<string, number> = {};
  const authors = new Set<string>();

  let newSinceLastRun = 0;
  let duplicatesFound = 0;

  for (const item of items) {
    // Channel counts
    byChannel[item.channel] = (byChannel[item.channel] ?? 0) + 1;

    // Type counts
    byType[item.type] = (byType[item.type] ?? 0) + 1;

    // Topic counts
    for (const topic of item.tags.topic) {
      byTopic[topic] = (byTopic[topic] ?? 0) + 1;
    }

    // Signal counts
    for (const signal of item.tags.signal) {
      bySignal[signal] = (bySignal[signal] ?? 0) + 1;
    }

    // Authors
    if (item.author) authors.add(item.author);

    // New items
    if (!state.known_ids.has(item.canonical_id)) {
      newSinceLastRun++;
    }

    // Dupes
    if (item.dedupe.is_duplicate) {
      duplicatesFound++;
    }
  }

  return {
    totalItems: items.length,
    uniqueAuthors: authors.size,
    byChannel,
    byType,
    byTopic,
    bySignal,
    newSinceLastRun,
    duplicatesFound,
  };
}

// ─── Trends ─────────────────────────────────────────────────────────────────

function computeTrends(items: ClassifiedItem[], _state: RunState): Trend[] {
  // Count topics in current run
  const topicCounts = new Map<string, number>();
  for (const item of items) {
    for (const topic of item.tags.topic) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  // Without historical data, mark everything as 'new' for first run
  // Future runs will compare against previous metrics
  const trends: Trend[] = [];
  for (const [topic, count] of topicCounts) {
    trends.push({
      topic,
      direction: 'new',
      count,
      previousCount: 0,
    });
  }

  return trends.sort((a, b) => b.count - a.count);
}

// ─── Gaps ───────────────────────────────────────────────────────────────────

/** Expected topics that should show up if the ecosystem is healthy */
const EXPECTED_TOPICS = [
  'apphost', 'dashboard', 'integrations', 'k8s', 'aca',
  'otel', 'postgres', 'redis', 'dapr', 'auth', 'caching',
  'dotnet', 'typescript', 'python', 'docker', 'deploy', 'testing',
];

function identifyGaps(items: ClassifiedItem[]): Gap[] {
  const seenTopics = new Set<string>();
  for (const item of items) {
    for (const topic of item.tags.topic) {
      seenTopics.add(topic);
    }
  }

  const gaps: Gap[] = [];
  for (const topic of EXPECTED_TOPICS) {
    if (!seenTopics.has(topic)) {
      gaps.push({
        topic,
        reason: `No content found for "${topic}" in this run`,
        suggestedAction: `Create or find content covering Aspire + ${topic}`,
      });
    }
  }

  return gaps;
}

// ─── Amplifications ─────────────────────────────────────────────────────────

function generateAmplifications(items: ClassifiedItem[]): Amplification[] {
  const candidates: Amplification[] = [];

  for (const item of items) {
    if (item.tags.actionability !== 'amplify') continue;
    if (item.tags.confidence === 'low') continue;

    candidates.push({
      itemId: item.canonical_id,
      title: item.title,
      url: item.url,
      platform: suggestPlatform(item),
      suggestedCopy: generateCopy(item),
    });
  }

  return candidates.slice(0, 20); // Cap at 20 candidates per run
}

function suggestPlatform(item: ClassifiedItem): string {
  switch (item.channel) {
    case 'github': return 'X, LinkedIn';
    case 'youtube': return 'X, LinkedIn, GitHub Discussions';
    case 'devto':
    case 'medium':
    case 'substack':
      return 'X, LinkedIn';
    default: return 'X';
  }
}

function generateCopy(item: ClassifiedItem): string {
  const topicTag = item.tags.topic[0] ?? 'Aspire';
  const authorMention = item.author ? ` by ${item.author}` : '';
  return `🚀 Check out "${item.title}"${authorMention} — great resource on #${topicTag} with .NET Aspire! ${item.url}`;
}
