/**
 * GitHubSourceAdapter — GitHub search discovery implementation.
 * Extracted from community.ts with no functional changes.
 */

import { Octokit } from '@octokit/rest';
import type { Channel, ContentItem, ContentType, DiscoveryResult, RunState, Signal } from '../../types.js';
import type { AdapterValidation, SourceAdapter } from './types.js';
import { generateCanonicalId, truncate } from './helpers.js';

const GITHUB_QUERIES: readonly string[] = [
  'aspire apphost',
  'aspire dashboard',
  'dotnet aspire',
  'aspire service discovery',
  'aspire integration',
] as const;

export class GitHubSourceAdapter implements SourceAdapter {
  readonly name = 'github';
  readonly displayName = 'GitHub';
  readonly channel: Channel = 'github';

  async validate(): Promise<AdapterValidation> {
    const token = process.env['GITHUB_TOKEN'];
    if (!token) {
      return {
        valid: true,
        warnings: ['GITHUB_TOKEN not set - using unauthenticated API (lower rate limits)'],
      };
    }
    return { valid: true };
  }

  async discover(state: RunState): Promise<DiscoveryResult[]> {
    const token = process.env['GITHUB_TOKEN'];
    const octokit = new Octokit(token ? { auth: token } : {});
    const results: DiscoveryResult[] = [];
    const sinceDate = state.last_run;

    for (const query of GITHUB_QUERIES) {
      try {
        console.log(`  🔍 GitHub search: "${query}"`);

        const repoResults = await searchGitHubRepos(octokit, query, sinceDate);
        if (repoResults.items.length > 0) {
          results.push(repoResults);
        }

        const issueResults = await searchGitHubIssues(octokit, query, sinceDate);
        if (issueResults.items.length > 0) {
          results.push(issueResults);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠️  GitHub search "${query}" failed: ${message}`);
      }
    }

    return results;
  }
}

async function searchGitHubRepos(
  octokit: Octokit,
  query: string,
  since: string,
): Promise<DiscoveryResult> {
  const sinceDate = since.split('T')[0] ?? since;
  const searchQuery = `${query} pushed:>=${sinceDate}`;

  const response = await octokit.search.repos({
    q: searchQuery,
    sort: 'updated',
    order: 'desc',
    per_page: 30,
  });

  const items: ContentItem[] = response.data.items.map((repo) => {
    const type: ContentType = inferGitHubContentType(repo.description ?? '');
    return {
      canonical_id: generateCanonicalId(
        repo.full_name,
        repo.html_url,
        repo.owner?.login ?? null,
        repo.pushed_at,
      ),
      title: repo.full_name,
      url: repo.html_url,
      type,
      channel: 'github',
      published_at: repo.created_at,
      author: repo.owner?.login ?? null,
      summary: truncate(repo.description ?? 'No description', 300),
      tags: {
        topic: extractGitHubTopics(repo.topics ?? [], repo.description ?? ''),
        audience: ['intermediate'],
        signal: ['adoption'],
        confidence: 'medium',
        actionability: 'investigate',
      },
      provenance: {
        discovered_from: 'github:repos',
        discovered_query: query,
        source_first_seen: new Date().toISOString(),
        raw_evidence_path: null,
      },
      dedupe: {
        is_duplicate: false,
        duplicate_of: null,
        duplicate_reason: null,
      },
    };
  });

  return { items, source: 'github:repos', query };
}

async function searchGitHubIssues(
  octokit: Octokit,
  query: string,
  since: string,
): Promise<DiscoveryResult> {
  const sinceDate = since.split('T')[0] ?? since;
  const searchQuery = `${query} created:>=${sinceDate}`;

  const response = await octokit.search.issuesAndPullRequests({
    q: searchQuery,
    sort: 'created',
    order: 'desc',
    per_page: 30,
  });

  const items: ContentItem[] = response.data.items.map((issue) => {
    const type: ContentType = issue.pull_request ? 'repo' : 'issue';
    return {
      canonical_id: generateCanonicalId(
        issue.title,
        issue.html_url,
        issue.user?.login ?? null,
        issue.created_at,
      ),
      title: issue.title,
      url: issue.html_url,
      type,
      channel: 'github',
      published_at: issue.created_at,
      author: issue.user?.login ?? null,
      summary: truncate(issue.body ?? 'No description', 300),
      tags: {
        topic: extractGitHubTopics(issue.labels
          .map((l) => (typeof l === 'string' ? l : l.name ?? ''))
          .filter(Boolean), issue.title),
        audience: ['intermediate'],
        signal: inferIssueSignal(issue.title, issue.body ?? ''),
        confidence: 'medium',
        actionability: 'investigate',
      },
      provenance: {
        discovered_from: 'github:issues',
        discovered_query: query,
        source_first_seen: new Date().toISOString(),
        raw_evidence_path: null,
      },
      dedupe: {
        is_duplicate: false,
        duplicate_of: null,
        duplicate_reason: null,
      },
    };
  });

  return { items, source: 'github:issues', query };
}

function inferGitHubContentType(description: string): ContentType {
  const lower = description.toLowerCase();
  if (lower.includes('sample') || lower.includes('example') || lower.includes('template')) return 'sample';
  if (lower.includes('release')) return 'release';
  return 'repo';
}

function extractGitHubTopics(topics: string[], description: string): string[] {
  const text = [...topics, description].join(' ').toLowerCase();
  const topicMap: Record<string, string[]> = {
    apphost: ['apphost', 'app-host'],
    dashboard: ['dashboard'],
    integrations: ['integration'],
    k8s: ['kubernetes', 'k8s'],
    aca: ['azure-container-app', 'aca'],
    otel: ['opentelemetry', 'otel'],
    dotnet: ['.net', 'dotnet', 'csharp'],
    docker: ['docker', 'container'],
  };

  const found: string[] = [];
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((k) => text.includes(k))) {
      found.push(topic);
    }
  }
  return found.length > 0 ? found : ['aspire'];
}

function inferIssueSignal(title: string, body: string): Signal[] {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes('bug') || text.includes('error') || text.includes('crash')) return ['complaint'];
  if (text.includes('feature') || text.includes('request') || text.includes('please add')) return ['request'];
  if (text.includes('how to') || text.includes('help') || text.includes('question')) return ['confusion'];
  return ['other'];
}
