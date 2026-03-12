/**
 * Shared helpers for discovery adapters.
 * Consolidates ID generation, keyword matching, and text utilities.
 */

import { createHash } from 'node:crypto';

export const SEARCH_KEYWORDS: readonly string[] = [
  'Aspire dev',
  'Aspire 9',
  'Aspire 9.1',
  'Aspire 9.2',
  'Aspire 9.3',
  'Aspirified',
  'Aspire AppHost',
  'Aspire dashboard',
  'Aspire manifest',
  'Aspire service discovery',
  'Aspire .NET',
  'Aspire dotnet',
  'Aspire C#',
  'Aspire csharp',
  'Aspire CLI',
  'Aspire javascript',
  'Aspire python',
  'Aspire azure',
  'Aspire aws',
  'Aspire deploy',
  'Aspire docker',
  'Aspire distributed',
  'Aspire app',
  'Aspire code',
  'Aspire kubernetes',
  'Aspire aca',
  'Aspire redis',
  'Aspire otel',
] as const;

export const EXCLUSION_KEYWORDS: readonly string[] = [
  'aspirelearning',
  'aspiremag',
  'buildinpublic',
  '#openenrollment',
  '#aspirepublicschools',
  '#aspirelosangeles',
] as const;

export function generateCanonicalId(
  title: string,
  url: string,
  author: string | null,
  date: string | null,
): string {
  const input = [title, url, author ?? '', date ?? ''].join('|').toLowerCase();
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

export function isAspireRelated(text: string): boolean {
  const lower = text.toLowerCase();
  const markers = [
    'aspire', 'apphost', 'aspire dashboard',
    'service discovery', 'aspire manifest',
    '.net aspire', 'dotnet aspire',
  ];
  return markers.some((m) => lower.includes(m));
}

export function isExcluded(text: string): boolean {
  const lower = text.toLowerCase();
  return EXCLUSION_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
