/**
 * Output generation module.
 *
 * Generates ALL 9 report files specified in ACCES.md §2,
 * plus /raw/, /triage/, /assets/ subdirectories.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ClassifiedItem,
  ContentItem,
  RunOutput,
  WatchlistEntry,
} from './types.js';

/**
 * Generate the complete run output: 9 report files + subdirectories.
 */
export async function generateOutput(result: RunOutput): Promise<void> {
  const dir = result.outputDir;

  // Create directory structure
  await mkdir(join(dir, 'raw'), { recursive: true });
  await mkdir(join(dir, 'triage'), { recursive: true });
  await mkdir(join(dir, 'assets'), { recursive: true });

  // Generate all 9 reports in parallel
  await Promise.all([
    writeFile(join(dir, '01_new-since-last-run.md'), generateNewSinceLastRun(result), 'utf-8'),
    writeFile(join(dir, '02_next-actions.md'), generateNextActions(result), 'utf-8'),
    writeFile(join(dir, '03_month-to-date_rollup.md'), generateMonthToDate(result), 'utf-8'),
    writeFile(join(dir, '04_source-ledger.json'), generateSourceLedger(result), 'utf-8'),
    writeFile(join(dir, '05_dedupe-map.md'), generateDedupeMap(result), 'utf-8'),
    writeFile(join(dir, '06_watchlist.md'), generateWatchlist(result), 'utf-8'),
    writeFile(join(dir, '07_gap-analysis.md'), generateGapAnalysis(result), 'utf-8'),
    writeFile(join(dir, '08_candidate-amplifications.md'), generateAmplifications(result), 'utf-8'),
    writeFile(join(dir, '09_metrics.md'), generateMetrics(result), 'utf-8'),
  ]);

  // Write raw evidence placeholder
  await writeFile(
    join(dir, 'raw', 'README.md'),
    '# Raw Evidence\n\nRaw captures (RSS dumps, API responses) are stored here.\n',
    'utf-8',
  );

  // Write triage placeholder
  const triageItems = result.items.filter((i) => i.tags.confidence === 'low');
  if (triageItems.length > 0) {
    await writeFile(
      join(dir, 'triage', 'needs-review.md'),
      generateTriageList(triageItems),
      'utf-8',
    );
  }
}

// ─── 01: New Since Last Run ────────────────────────────────────────────────

function generateNewSinceLastRun(result: RunOutput): string {
  const { items, timestamp, isBootstrap, state } = result;
  const newItems = items.filter((i) => !state.known_ids.has(i.canonical_id));

  const lines: string[] = [
    `# New Since Last Run`,
    ``,
    `**Run:** ${timestamp}`,
    `**Mode:** ${isBootstrap ? '🆕 Bootstrap (last 30 days)' : '📊 Incremental'}`,
    `**Items found:** ${newItems.length}`,
    ``,
    `## Executive Summary`,
    ``,
  ];

  // Executive summary bullets
  const { metrics } = result.analysis;
  lines.push(`- **${metrics.totalItems}** total items discovered`);
  lines.push(`- **${metrics.uniqueAuthors}** unique authors`);
  lines.push(`- **${metrics.newSinceLastRun}** new items since last run`);
  lines.push(`- **${metrics.duplicatesFound}** duplicates filtered`);
  lines.push(`- Top channel: ${topEntry(metrics.byChannel)}`);
  lines.push(`- Top type: ${topEntry(metrics.byType)}`);
  lines.push(`- Top topic: ${topEntry(metrics.byTopic)}`);
  lines.push(``);

  // Group by type
  const byType = groupBy(newItems, (i) => i.type);
  for (const [type, typeItems] of Object.entries(byType)) {
    lines.push(`## ${capitalize(type)}s`);
    lines.push(``);

    for (const item of typeItems) {
      lines.push(`### ${item.title}`);
      lines.push(`- **URL:** ${item.url}`);
      if (item.author) lines.push(`- **Author:** ${item.author}`);
      if (item.published_at) lines.push(`- **Published:** ${item.published_at}`);
      lines.push(`- **Summary:** ${item.summary}`);
      lines.push(`- **Tags:** ${item.tags.topic.join(', ')} | ${item.tags.signal.join(', ')} | confidence: ${item.tags.confidence}`);
      lines.push(`- **Recommended action:** ${item.tags.actionability}`);
      lines.push(``);
    }
  }

  if (newItems.length === 0) {
    lines.push(`_No new items found this run._`);
  }

  return lines.join('\n');
}

// ─── 02: Next Actions ──────────────────────────────────────────────────────

function generateNextActions(result: RunOutput): string {
  const { analysis, items } = result;
  const lines: string[] = [
    `# Next Actions`,
    ``,
    `**Run:** ${result.timestamp}`,
    ``,
    `## Top 5 Recommended Actions`,
    ``,
  ];

  // Generate actions from analysis
  const actions: { action: string; rationale: string; link: string }[] = [];

  // Amplification actions
  for (const amp of analysis.amplifications.slice(0, 3)) {
    actions.push({
      action: `Amplify: "${amp.title}"`,
      rationale: `High-value content suitable for ${amp.platform}`,
      link: amp.url,
    });
  }

  // Gap actions
  for (const gap of analysis.gaps.slice(0, 2)) {
    actions.push({
      action: `Fill gap: ${gap.topic}`,
      rationale: gap.reason,
      link: '',
    });
  }

  for (const [i, a] of actions.slice(0, 5).entries()) {
    lines.push(`${i + 1}. **${a.action}**`);
    lines.push(`   - Rationale: ${a.rationale}`);
    if (a.link) lines.push(`   - Link: ${a.link}`);
    lines.push(``);
  }

  if (actions.length === 0) {
    lines.push(`_No specific actions generated this run._`);
    lines.push(``);
  }

  // Community response queue
  lines.push(`## Community Response Queue`);
  lines.push(``);
  const respondItems = items.filter((i) => i.tags.actionability === 'respond');
  if (respondItems.length > 0) {
    for (const item of respondItems.slice(0, 10)) {
      lines.push(`- [${item.title}](${item.url}) — ${item.tags.signal.join(', ')}`);
    }
  } else {
    lines.push(`_No items requiring response._`);
  }
  lines.push(``);

  // Amplification queue
  lines.push(`## Amplification Queue`);
  lines.push(``);
  const ampItems = items.filter((i) => i.tags.actionability === 'amplify');
  if (ampItems.length > 0) {
    for (const item of ampItems.slice(0, 10)) {
      lines.push(`- [${item.title}](${item.url}) — ${item.tags.topic.join(', ')}`);
    }
  } else {
    lines.push(`_No amplification candidates._`);
  }
  lines.push(``);

  // Content gaps
  lines.push(`## Content Gaps to Fill`);
  lines.push(``);
  if (analysis.gaps.length > 0) {
    for (const gap of analysis.gaps) {
      lines.push(`- **${gap.topic}**: ${gap.reason} → ${gap.suggestedAction}`);
    }
  } else {
    lines.push(`_No significant gaps identified._`);
  }
  lines.push(``);

  // Outreach
  lines.push(`## Partner/Creator Outreach List`);
  lines.push(``);
  const authors = new Set<string>();
  for (const item of items) {
    if (item.author && item.tags.actionability === 'amplify') {
      authors.add(item.author);
    }
  }
  if (authors.size > 0) {
    for (const author of authors) {
      lines.push(`- ${author}`);
    }
  } else {
    lines.push(`_No outreach targets identified._`);
  }

  return lines.join('\n');
}

// ─── 03: Month-to-Date Rollup ──────────────────────────────────────────────

function generateMonthToDate(result: RunOutput): string {
  const { analysis, items, timestamp } = result;
  const { metrics } = analysis;

  const lines: string[] = [
    `# Month-to-Date Rollup`,
    ``,
    `**As of:** ${timestamp}`,
    ``,
    `## Top Items`,
    ``,
  ];

  // Top items by "impact" (high confidence + amplify actionability)
  const topItems = items
    .filter((i) => i.tags.confidence !== 'low')
    .slice(0, 10);

  for (const item of topItems) {
    lines.push(`- **[${item.title}](${item.url})** — ${item.type} via ${item.channel}`);
  }
  lines.push(``);

  // Top recurring topics
  lines.push(`## Top Recurring Topics`);
  lines.push(``);
  const sortedTopics = Object.entries(metrics.byTopic).sort(([, a], [, b]) => b - a);
  for (const [topic, count] of sortedTopics.slice(0, 10)) {
    lines.push(`- **${topic}**: ${count} items`);
  }
  lines.push(``);

  // Notable new creators
  lines.push(`## Notable Contributors`);
  lines.push(``);
  const authorCounts = new Map<string, number>();
  for (const item of items) {
    if (item.author) {
      authorCounts.set(item.author, (authorCounts.get(item.author) ?? 0) + 1);
    }
  }
  const topAuthors = [...authorCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 10);
  for (const [author, count] of topAuthors) {
    lines.push(`- **${author}**: ${count} items`);
  }
  if (topAuthors.length === 0) lines.push(`_No author data available._`);
  lines.push(``);

  // Pain points
  lines.push(`## Key Pain Points & Recurring Questions`);
  lines.push(``);
  const confusionItems = items.filter((i) => i.tags.signal.includes('confusion'));
  const complaintItems = items.filter((i) => i.tags.signal.includes('complaint'));
  if (confusionItems.length > 0 || complaintItems.length > 0) {
    for (const item of [...confusionItems, ...complaintItems].slice(0, 10)) {
      lines.push(`- [${item.title}](${item.url}) — ${item.tags.signal.join(', ')}`);
    }
  } else {
    lines.push(`_No pain points identified this run._`);
  }
  lines.push(``);

  // Suggested editorial calendar
  lines.push(`## Suggested Editorial Calendar (Next 2–4 Weeks)`);
  lines.push(``);
  const gapTopics = analysis.gaps.slice(0, 4);
  if (gapTopics.length > 0) {
    lines.push(`| Week | Topic | Action |`);
    lines.push(`|------|-------|--------|`);
    for (const [i, gap] of gapTopics.entries()) {
      lines.push(`| Week ${i + 1} | ${gap.topic} | ${gap.suggestedAction} |`);
    }
  } else {
    lines.push(`_Calendar to be generated with more data._`);
  }

  return lines.join('\n');
}

// ─── 04: Source Ledger (JSON) ───────────────────────────────────────────────

function generateSourceLedger(result: RunOutput): string {
  // Serialize items — strip non-serializable fields
  const ledger = result.items.map((item) => ({
    canonical_id: item.canonical_id,
    title: item.title,
    url: item.url,
    type: item.type,
    channel: item.channel,
    published_at: item.published_at,
    author: item.author,
    summary: item.summary,
    tags: item.tags,
    provenance: item.provenance,
    dedupe: item.dedupe,
  }));

  return JSON.stringify(ledger, null, 2);
}

// ─── 05: Dedupe Map ────────────────────────────────────────────────────────

function generateDedupeMap(result: RunOutput): string {
  const dupes = result.items.filter((i) => i.dedupe.is_duplicate);

  const lines: string[] = [
    `# Dedupe Map`,
    ``,
    `**Run:** ${result.timestamp}`,
    `**Duplicates found:** ${dupes.length}`,
    ``,
  ];

  if (dupes.length > 0) {
    lines.push(`| Item | Duplicate Of | Reason |`);
    lines.push(`|------|-------------|--------|`);
    for (const item of dupes) {
      lines.push(`| ${item.title} | ${item.dedupe.duplicate_of ?? 'unknown'} | ${item.dedupe.duplicate_reason ?? 'unknown'} |`);
    }
  } else {
    lines.push(`_No duplicates detected this run._`);
  }

  return lines.join('\n');
}

// ─── 06: Watchlist ──────────────────────────────────────────────────────────

function generateWatchlist(result: RunOutput): string {
  // Build watchlist from discovered items
  const entries = buildWatchlist(result.items);

  const lines: string[] = [
    `# Watchlist`,
    ``,
    `**Run:** ${result.timestamp}`,
    `**Tracked sources:** ${entries.length}`,
    ``,
    `| Name | Type | URL | Items | Last Seen |`,
    `|------|------|-----|-------|-----------|`,
  ];

  for (const entry of entries) {
    lines.push(`| ${entry.name} | ${entry.type} | ${entry.url} | ${entry.itemCount} | ${entry.lastSeen ?? 'N/A'} |`);
  }

  if (entries.length === 0) {
    lines.push(`| _No sources tracked yet_ | | | | |`);
  }

  return lines.join('\n');
}

function buildWatchlist(items: ContentItem[]): WatchlistEntry[] {
  const authorMap = new Map<string, WatchlistEntry>();
  const channelMap = new Map<string, WatchlistEntry>();

  for (const item of items) {
    // Track authors
    if (item.author) {
      const existing = authorMap.get(item.author);
      if (existing) {
        existing.itemCount++;
        existing.lastSeen = item.provenance.source_first_seen;
      } else {
        authorMap.set(item.author, {
          name: item.author,
          url: item.url,
          type: 'author',
          lastSeen: item.provenance.source_first_seen,
          itemCount: 1,
        });
      }
    }

    // Track channels
    const channelKey = item.channel;
    const existing = channelMap.get(channelKey);
    if (existing) {
      existing.itemCount++;
    } else {
      channelMap.set(channelKey, {
        name: channelKey,
        url: '',
        type: 'channel',
        lastSeen: item.provenance.source_first_seen,
        itemCount: 1,
      });
    }
  }

  return [
    ...[...authorMap.values()].sort((a, b) => b.itemCount - a.itemCount),
    ...[...channelMap.values()].sort((a, b) => b.itemCount - a.itemCount),
  ];
}

// ─── 07: Gap Analysis ──────────────────────────────────────────────────────

function generateGapAnalysis(result: RunOutput): string {
  const { gaps } = result.analysis;

  const lines: string[] = [
    `# Gap Analysis`,
    ``,
    `**Run:** ${result.timestamp}`,
    `**Gaps identified:** ${gaps.length}`,
    ``,
    `These are topics/areas where we're not seeing enough community content.`,
    ``,
  ];

  if (gaps.length > 0) {
    for (const gap of gaps) {
      lines.push(`## ${capitalize(gap.topic)}`);
      lines.push(``);
      lines.push(`- **Issue:** ${gap.reason}`);
      lines.push(`- **Suggested action:** ${gap.suggestedAction}`);
      lines.push(``);
    }
  } else {
    lines.push(`_All expected topics have coverage. 🎉_`);
  }

  return lines.join('\n');
}

// ─── 08: Candidate Amplifications ──────────────────────────────────────────

function generateAmplifications(result: RunOutput): string {
  const { amplifications } = result.analysis;

  const lines: string[] = [
    `# Candidate Amplifications`,
    ``,
    `**Run:** ${result.timestamp}`,
    `**Candidates:** ${amplifications.length}`,
    ``,
    `Short "ready-to-post" copy suggestions with citations.`,
    ``,
  ];

  if (amplifications.length > 0) {
    for (const amp of amplifications) {
      lines.push(`## ${amp.title}`);
      lines.push(``);
      lines.push(`- **Platform:** ${amp.platform}`);
      lines.push(`- **URL:** ${amp.url}`);
      lines.push(`- **Suggested copy:**`);
      lines.push(`  > ${amp.suggestedCopy}`);
      lines.push(``);
    }
  } else {
    lines.push(`_No amplification candidates this run._`);
  }

  return lines.join('\n');
}

// ─── 09: Metrics ────────────────────────────────────────────────────────────

function generateMetrics(result: RunOutput): string {
  const { metrics, trends } = result.analysis;

  const lines: string[] = [
    `# Metrics`,
    ``,
    `**Run:** ${result.timestamp}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total items | ${metrics.totalItems} |`,
    `| Unique authors | ${metrics.uniqueAuthors} |`,
    `| New since last run | ${metrics.newSinceLastRun} |`,
    `| Duplicates found | ${metrics.duplicatesFound} |`,
    ``,
    `## By Channel`,
    ``,
    `| Channel | Count |`,
    `|---------|-------|`,
  ];

  for (const [channel, count] of Object.entries(metrics.byChannel).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${channel} | ${count} |`);
  }
  lines.push(``);

  lines.push(`## By Type`);
  lines.push(``);
  lines.push(`| Type | Count |`);
  lines.push(`|------|-------|`);
  for (const [type, count] of Object.entries(metrics.byType).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${type} | ${count} |`);
  }
  lines.push(``);

  lines.push(`## By Topic`);
  lines.push(``);
  lines.push(`| Topic | Count |`);
  lines.push(`|-------|-------|`);
  for (const [topic, count] of Object.entries(metrics.byTopic).sort(([, a], [, b]) => b - a)) {
    lines.push(`| ${topic} | ${count} |`);
  }
  lines.push(``);

  lines.push(`## Trends vs Last Run`);
  lines.push(``);
  if (trends.length > 0) {
    lines.push(`| Topic | Direction | Count | Previous |`);
    lines.push(`|-------|-----------|-------|----------|`);
    for (const trend of trends) {
      const arrow = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : trend.direction === 'new' ? '🆕' : '➡️';
      lines.push(`| ${trend.topic} | ${arrow} ${trend.direction} | ${trend.count} | ${trend.previousCount} |`);
    }
  } else {
    lines.push(`_No trend data available yet._`);
  }

  return lines.join('\n');
}

// ─── Triage list ────────────────────────────────────────────────────────────

function generateTriageList(items: ContentItem[]): string {
  const lines: string[] = [
    `# Items Needing Manual Review`,
    ``,
    `These items were tagged with \`confidence: low\` and need verification.`,
    ``,
  ];

  for (const item of items) {
    lines.push(`## ${item.title}`);
    lines.push(``);
    lines.push(`- **URL:** ${item.url}`);
    lines.push(`- **Why:** Low confidence in Aspire relevance`);
    lines.push(`- **Summary:** ${item.summary}`);
    lines.push(``);
  }

  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function topEntry(record: Record<string, number>): string {
  const entries = Object.entries(record).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return 'N/A';
  const top = entries[0];
  if (!top) return 'N/A';
  return `${top[0]} (${top[1]})`;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    const group = result[key];
    if (group) {
      group.push(item);
    } else {
      result[key] = [item];
    }
  }
  return result;
}
