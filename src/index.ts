/**
 * ACCES — Aspire Community Content Engine Squad
 *
 * Entry point / pipeline orchestrator.
 * Runs: load state → discover → dedupe → classify → analyze → output → save state
 */

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadState, saveState } from './state.js';
import { createDefaultRegistry } from './discovery/adapters/index.js';
import { classify, deduplicate } from './taxonomy.js';
import { analyze } from './analysis.js';
import { generateOutput } from './output.js';
import type { ContentItem, DiscoveryResult, RunOutput } from './types.js';

/**
 * Format a Date as YYYY-MM-DD_HH-mm-ss for output folder names.
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return [
    date.getFullYear(),
    '-', pad(date.getMonth() + 1),
    '-', pad(date.getDate()),
    '_',
    pad(date.getHours()),
    '-', pad(date.getMinutes()),
    '-', pad(date.getSeconds()),
  ].join('');
}

/**
 * Main pipeline orchestrator.
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  const timestamp = formatTimestamp(new Date());

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ACCES — Aspire Community Content Engine Squad  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  Run: ${timestamp}`);
  console.log('');

  // ── Step 1: Load state ──────────────────────────────────────────────
  console.log('📦 Loading state...');
  const { state, isBootstrap } = await loadState();
  if (isBootstrap) {
    console.log('  🆕 Bootstrap mode — looking back 30 days');
  } else {
    console.log(`  📅 Last run: ${state.last_run}`);
    console.log(`  📊 Known IDs: ${state.known_ids.size}`);
  }
  console.log('');

  // ── Step 2: Discover ────────────────────────────────────────────────
  console.log('🔍 Discovering content...');
  const registry = createDefaultRegistry();
  const registryResult = await registry.discoverAll(state);

  const allItems: ContentItem[] = [];
  for (const result of registryResult.results) {
    console.log(`  ✅ ${result.source}: ${result.items.length} items`);
    allItems.push(...result.items);
  }

  console.log(`  📋 Total raw items: ${allItems.length}`);
  
  if (registryResult.skipped.length > 0) {
    console.log(`  ⏭️  Skipped: ${registryResult.skipped.join(', ')}`);
  }
  
  if (registryResult.errors.size > 0) {
    console.log(`  ⚠️  ${registryResult.errors.size} adapter(s) had errors`);
  }
  
  console.log('');

  // ── Step 3: Deduplicate ─────────────────────────────────────────────
  console.log('🔗 Deduplicating...');
  const { unique, dupes } = deduplicate(allItems);
  console.log(`  ✅ ${unique.length} unique items, ${dupes.size} duplicates removed`);
  console.log('');

  // ── Step 4: Classify ────────────────────────────────────────────────
  console.log('🏷️  Classifying...');
  const classified = classify(unique);
  console.log(`  ✅ ${classified.length} items classified`);
  console.log('');

  // ── Step 5: Analyze ─────────────────────────────────────────────────
  console.log('📊 Analyzing signals...');
  const analysis = analyze(classified, state);
  console.log(`  📈 Trends: ${analysis.trends.length}`);
  console.log(`  🕳️  Gaps: ${analysis.gaps.length}`);
  console.log(`  📢 Amplifications: ${analysis.amplifications.length}`);
  console.log('');

  // ── Step 6: Generate output ─────────────────────────────────────────
  const outputDir = join('AspireContentEngine', timestamp);
  console.log(`📝 Generating output → ${outputDir}`);
  await mkdir(outputDir, { recursive: true });

  // Include ALL items (unique + dupes for ledger) but analysis is on unique
  const runOutput: RunOutput = {
    timestamp,
    outputDir,
    items: [...classified, ...allItems.filter((i) => i.dedupe.is_duplicate)],
    analysis,
    state,
    isBootstrap,
  };

  await generateOutput(runOutput);
  console.log('  ✅ All 9 report files generated');
  console.log('  ✅ /raw/, /triage/, /assets/ created');
  console.log('');

  // ── Step 7: Save state ──────────────────────────────────────────────
  console.log('💾 Saving state...');
  const updatedState = {
    last_run: new Date().toISOString(),
    known_ids: new Set([...state.known_ids, ...classified.map((i) => i.canonical_id)]),
    known_dupes: new Map([...state.known_dupes, ...dupes]),
  };
  await saveState(updatedState);
  console.log('  ✅ State saved');
  console.log('');

  // ── Done ────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log(`║  ✅ Run complete in ${elapsed}s`);
  console.log(`║  📁 Output: ${outputDir}`);
  console.log(`║  📋 Items: ${classified.length} unique, ${dupes.size} dupes`);
  console.log('╚══════════════════════════════════════════════════╝');
}

// Run and handle top-level errors gracefully
main().catch((err) => {
  console.error('');
  console.error('💥 Fatal error:');
  console.error(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exitCode = 1;
});
