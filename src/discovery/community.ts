/**
 * Community discovery module — backward compatibility facade.
 * Redirects to adapter-based discovery. GitHub logic moved to adapters/github.ts.
 */

import { GitHubSourceAdapter } from './adapters/github.js';
import type { DiscoveryResult, RunState } from '../types.js';

/**
 * @deprecated Use createDefaultRegistry().discoverAll() instead.
 */
export async function discoverCommunity(state: RunState): Promise<DiscoveryResult[]> {
  const adapter = new GitHubSourceAdapter();
  const validation = await adapter.validate();
  if (!validation.valid) {
    console.warn(`⚠️  GitHub adapter validation failed: ${validation.reason}`);
    return [];
  }
  
  if (validation.warnings) {
    for (const warning of validation.warnings) {
      console.warn(`⚠️  ${warning}`);
    }
  }
  
  return adapter.discover(state);
}
