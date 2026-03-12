/**
 * GitHubDiscussionsSourceAdapter — GitHub Discussions discovery implementation.
 * Targets dotnet/aspire repository discussions via GraphQL API.
 */

import { Octokit } from '@octokit/rest';
import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState, Signal } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, truncate } from './helpers.js';

const TARGET_OWNER = 'dotnet';
const TARGET_REPO = 'aspire';

interface DiscussionNode {
  title: string;
  url: string;
  createdAt: string;
  author: { login: string } | null;
  category: { name: string } | null;
  upvoteCount: number;
  comments: { totalCount: number };
  body: string;
  isAnswered: boolean;
}

interface GraphQLResponse {
  repository: {
    discussions: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: DiscussionNode[];
    };
  };
}

export class GitHubDiscussionsSourceAdapter implements SourceAdapter {
  readonly name = 'github-discussions';
  readonly displayName = 'GitHub Discussions';
  readonly channel: Channel = 'github';

  async validate(): Promise<AdapterValidation> {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      return {
        valid: false,
        reason: 'GITHUB_TOKEN required for GraphQL Discussions API',
      };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      throw new Error('GITHUB_TOKEN required for GitHub Discussions API');
    }

    const octokit = new Octokit({ auth: token });
    const discussions = await this.fetchDiscussions(octokit, state.last_run);

    if (discussions.length === 0) {
      return [];
    }

    const items: ContentItem[] = discussions.map((discussion) => ({
      canonical_id: generateCanonicalId(
        discussion.title,
        discussion.url,
        discussion.author?.login ?? null,
        discussion.createdAt,
      ),
      title: discussion.title,
      url: discussion.url,
      type: 'discussion' as ContentType,
      channel: 'github',
      published_at: discussion.createdAt,
      author: discussion.author?.login ?? null,
      summary: truncate(discussion.body ?? '', 300),
      tags: {
        topic: extractTopics(discussion.title, discussion.body, discussion.category?.name ?? null),
        audience: ['intermediate'],
        signal: inferDiscussionSignal(discussion),
        confidence: 'medium',
        actionability: discussion.isAnswered ? 'investigate' : 'respond',
      },
      provenance: {
        discovered_from: 'github:discussions',
        discovered_query: `${TARGET_OWNER}/${TARGET_REPO}`,
        source_first_seen: new Date().toISOString(),
        raw_evidence_path: null,
      },
      dedupe: {
        is_duplicate: false,
        duplicate_of: null,
        duplicate_reason: null,
      },
    }));

    return [{
      items,
      source: 'github:discussions',
      query: `${TARGET_OWNER}/${TARGET_REPO}`,
    }];
  }

  private async fetchDiscussions(octokit: Octokit, since: string): Promise<DiscussionNode[]> {
    const sinceDate = new Date(since);
    const allDiscussions: DiscussionNode[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    const maxPages = 3; // Limit to ~300 discussions max
    let pageCount = 0;

    console.log(`  🔍 GitHub Discussions: ${TARGET_OWNER}/${TARGET_REPO}`);

    while (hasNextPage && pageCount < maxPages) {
      const query = `
        query($owner: String!, $repo: String!, $first: Int!, $after: String) {
          repository(owner: $owner, name: $repo) {
            discussions(first: $first, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                title
                url
                createdAt
                author {
                  login
                }
                category {
                  name
                }
                upvoteCount
                comments {
                  totalCount
                }
                body
                isAnswered
              }
            }
          }
        }
      `;

      const variables = {
        owner: TARGET_OWNER,
        repo: TARGET_REPO,
        first: 100,
        after: cursor,
      };

      try {
        const response = await octokit.request('POST /graphql', {
          query,
          ...variables,
        });

        const responseData = response.data as { data?: GraphQLResponse; errors?: Array<{ message: string }> };

        if (responseData.errors) {
          throw new Error(`GraphQL errors: ${responseData.errors.map(e => e.message).join(', ')}`);
        }

        const data = (responseData.data ?? responseData) as GraphQLResponse;
        const discussions = data.repository.discussions;

        // Filter by date
        const filtered = discussions.nodes.filter((d) => {
          const createdAt = new Date(d.createdAt);
          return createdAt >= sinceDate;
        });

        allDiscussions.push(...filtered);

        // If we got fewer than we asked for after filtering, we've gone past the date threshold
        if (filtered.length < discussions.nodes.length) {
          break;
        }

        hasNextPage = discussions.pageInfo.hasNextPage;
        cursor = discussions.pageInfo.endCursor;
        pageCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  GitHub Discussions fetch failed: ${message}`);
        break;
      }
    }

    return allDiscussions;
  }
}

function extractTopics(title: string, body: string, category: string | null): string[] {
  const text = `${title} ${body ?? ''}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string[]> = {
    apphost: ['apphost', 'app-host', 'app host'],
    dashboard: ['dashboard'],
    deployment: ['deploy', 'deployment', 'kubernetes', 'k8s', 'aca', 'azure'],
    integrations: ['integration', 'component', 'redis', 'postgres', 'sql'],
    otel: ['opentelemetry', 'otel', 'telemetry'],
    dotnet: ['.net', 'dotnet', 'csharp', 'c#'],
    docker: ['docker', 'container'],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((k) => text.includes(k))) {
      topics.push(topic);
    }
  }

  // Add category if it exists
  if (category) {
    topics.push(category.toLowerCase().replace(/\s+/g, '-'));
  }

  return topics.length > 0 ? topics : ['aspire'];
}

function inferDiscussionSignal(discussion: DiscussionNode): Signal[] {
  const text = `${discussion.title} ${discussion.body ?? ''}`.toLowerCase();

  if (text.includes('bug') || text.includes('error') || text.includes('crash') || text.includes('issue')) {
    return ['complaint'];
  }
  if (text.includes('feature') || text.includes('request') || text.includes('enhancement')) {
    return ['request'];
  }
  if (text.includes('how') || text.includes('help') || text.includes('question') || text.includes('?')) {
    return ['confusion'];
  }
  if (discussion.upvoteCount > 10) {
    return ['adoption'];
  }
  if (text.includes('release') || text.includes('announcement')) {
    return ['release'];
  }
  if (text.includes('thanks') || text.includes('great') || text.includes('awesome') || text.includes('love')) {
    return ['praise'];
  }

  return ['other'];
}
