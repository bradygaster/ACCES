/**
 * Adapters module — pluggable discovery source pattern.
 * Export all adapters and provide a default registry factory.
 */

export * from './types.js';
export * from './helpers.js';
export { SourceRegistry } from './registry.js';
export { RSSSourceAdapter } from './rss.js';
export { GitHubSourceAdapter } from './github.js';
export { RedditSourceAdapter } from './reddit.js';
export { DevToSourceAdapter } from './devto.js';
export { StackOverflowSourceAdapter } from './stackoverflow.js';
export { GitHubDiscussionsSourceAdapter } from './discussions.js';

import { SourceRegistry } from './registry.js';
import { RSSSourceAdapter } from './rss.js';
import { GitHubSourceAdapter } from './github.js';
import { RedditSourceAdapter } from './reddit.js';
import { DevToSourceAdapter } from './devto.js';
import { StackOverflowSourceAdapter } from './stackoverflow.js';
import { GitHubDiscussionsSourceAdapter } from './discussions.js';

export function createDefaultRegistry(): SourceRegistry {
  const registry = new SourceRegistry();
  registry.register(new RSSSourceAdapter());
  registry.register(new GitHubSourceAdapter());
  registry.register(new RedditSourceAdapter());
  registry.register(new DevToSourceAdapter());
  registry.register(new StackOverflowSourceAdapter());
  registry.register(new GitHubDiscussionsSourceAdapter());
  return registry;
}
