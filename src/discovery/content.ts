/**
 * Content discovery module — backward compatibility facade.
 * Redirects to adapter-based discovery. RSS logic moved to adapters/rss.ts.
 */

import { RSSSourceAdapter } from './adapters/rss.js';
import type { DiscoveryResult, RunState } from '../types.js';

export { SEARCH_KEYWORDS, EXCLUSION_KEYWORDS, generateCanonicalId } from './adapters/helpers.js';

/**
 * @deprecated Use createDefaultRegistry().discoverAll() instead.
 */
export async function discoverContent(state: RunState): Promise<DiscoveryResult[]> {
  const adapter = new RSSSourceAdapter();
  const validation = await adapter.validate();
  if (!validation.valid) {
    console.warn(`⚠️  RSS adapter validation failed: ${validation.reason}`);
    return [];
  }
  return adapter.discover(state);
}
