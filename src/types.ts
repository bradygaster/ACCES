/**
 * ACCES Core Types
 *
 * All interfaces and type definitions derived from the ACCES.md spec.
 * Sections 4 (source-ledger schema) and 5 (taxonomy).
 */

// ─── Taxonomy unions (ACCES.md §5) ──────────────────────────────────────────

/** Content format / medium */
export type ContentType =
  | 'blog'
  | 'video'
  | 'sample'
  | 'repo'
  | 'release'
  | 'talk'
  | 'podcast'
  | 'reddit'
  | 'social'
  | 'article'
  | 'docs'
  | 'issue'
  | 'discussion'
  | 'other';

/** Discovery channel — known values plus open string for future channels */
export type Channel =
  | 'rss'
  | 'youtube'
  | 'github'
  | 'reddit'
  | 'devto'
  | 'medium'
  | 'substack'
  | 'personal_blog'
  | 'conference'
  | 'X'
  | 'bluesky'
  | 'linkedin'
  | 'stackoverflow'
  | 'podcast'
  | (string & {});

/** Target audience for the content */
export type Audience =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'decision-maker'
  | 'community-maintainer';

/** Signal the content conveys */
export type Signal =
  | 'adoption'
  | 'confusion'
  | 'praise'
  | 'complaint'
  | 'request'
  | 'tutorial'
  | 'release'
  | 'vulnerability'
  | 'other';

/** Confidence in classification accuracy */
export type Confidence = 'high' | 'medium' | 'low';

/** Recommended action */
export type Actionability =
  | 'amplify'
  | 'respond'
  | 'ignore'
  | 'follow-up'
  | 'investigate';

// ─── Tag bag ─────────────────────────────────────────────────────────────────

export interface Tags {
  topic: string[];
  audience: Audience[];
  signal: Signal[];
  confidence: Confidence;
  actionability: Actionability;
}

// ─── Provenance & dedupe ────────────────────────────────────────────────────

export interface Provenance {
  discovered_from: string;
  discovered_query: string | null;
  source_first_seen: string;
  raw_evidence_path: string | null;
}

export interface DedupeInfo {
  is_duplicate: boolean;
  duplicate_of: string | null;
  duplicate_reason: string | null;
}

// ─── Content item (core unit of work) ───────────────────────────────────────

export interface ContentItem {
  canonical_id: string;
  title: string;
  url: string;
  type: ContentType;
  channel: Channel;
  published_at: string | null;
  author: string | null;
  summary: string;
  tags: Tags;
  provenance: Provenance;
  dedupe: DedupeInfo;
}

// ─── Pipeline stage interfaces ──────────────────────────────────────────────

/** Raw results from a single discovery source */
export interface DiscoveryResult {
  items: ContentItem[];
  source: string;
  query?: string;
}

/** Item that has been through classification (tags fully populated) */
export interface ClassifiedItem extends ContentItem {
  /* tags are guaranteed filled after classification */
}

// ─── Analysis outputs ───────────────────────────────────────────────────────

export interface Trend {
  topic: string;
  direction: 'up' | 'down' | 'stable' | 'new';
  count: number;
  previousCount: number;
}

export interface Gap {
  topic: string;
  reason: string;
  suggestedAction: string;
}

export interface Amplification {
  itemId: string;
  title: string;
  url: string;
  platform: string;
  suggestedCopy: string;
}

export interface Metrics {
  totalItems: number;
  uniqueAuthors: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
  byTopic: Record<string, number>;
  bySignal: Record<string, number>;
  newSinceLastRun: number;
  duplicatesFound: number;
}

export interface AnalysisResult {
  trends: Trend[];
  gaps: Gap[];
  amplifications: Amplification[];
  metrics: Metrics;
}

// ─── Run state (persisted between runs) ─────────────────────────────────────

export interface RunState {
  last_run: string;
  known_ids: Set<string>;
  known_dupes: Map<string, string>;
}

/** Serializable form of RunState for JSON persistence */
export interface RunStateSerialized {
  last_run: string;
  known_ids: string[];
  known_dupes: Record<string, string>;
}

// ─── Run output (what a single execution produces) ──────────────────────────

export interface RunOutput {
  timestamp: string;
  outputDir: string;
  items: ContentItem[];
  analysis: AnalysisResult;
  state: RunState;
  isBootstrap: boolean;
}

// ─── Watchlist item (tracked channels/authors) ──────────────────────────────

export interface WatchlistEntry {
  name: string;
  url: string;
  type: 'author' | 'channel' | 'repo' | 'blog';
  lastSeen: string | null;
  itemCount: number;
}
