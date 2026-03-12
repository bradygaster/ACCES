/**
 * Adapters module — pluggable discovery source pattern.
 * Export all adapters and provide a default registry factory.
 */

export * from './types.js';
export * from './helpers.js';
export { SourceRegistry } from './registry.js';
export { RSSSourceAdapter } from './rss.js';
export { GitHubSourceAdapter } from './github.js';

import { SourceRegistry } from './registry.js';
import { RSSSourceAdapter } from './rss.js';
import { GitHubSourceAdapter } from './github.js';

export function createDefaultRegistry(): SourceRegistry {
  const registry = new SourceRegistry();
  registry.register(new RSSSourceAdapter());
  registry.register(new GitHubSourceAdapter());
  return registry;
}
