import type { SquadConfig } from '@bradygaster/squad';

/**
 * Squad Configuration for ACCES
 * Aspire Community Content Engine Squad
 * 
 * Team: The Wire universe
 * Customer: Beth Massi
 */
const config: SquadConfig = {
  version: '1.0.0',
  
  models: {
    defaultModel: 'claude-sonnet-4.5',
    defaultTier: 'standard',
    fallbackChains: {
      premium: ['claude-opus-4.6', 'claude-opus-4.6-fast', 'claude-opus-4.5', 'claude-sonnet-4.5'],
      standard: ['claude-sonnet-4.5', 'gpt-5.2-codex', 'claude-sonnet-4', 'gpt-5.2'],
      fast: ['claude-haiku-4.5', 'gpt-5.1-codex-mini', 'gpt-4.1', 'gpt-5-mini']
    },
    preferSameProvider: true,
    respectTierCeiling: true,
    nuclearFallback: {
      enabled: false,
      model: 'claude-haiku-4.5',
      maxRetriesBeforeNuclear: 3
    }
  },
  
  routing: {
    rules: [
      {
        workType: 'feature-dev',
        agents: ['@mcnulty'],
        examples: ['TypeScript implementation', 'build scripts', 'CLI entry points', 'output generation'],
        confidence: 'high'
      },
      {
        workType: 'architecture',
        agents: ['@freamon'],
        examples: ['design decisions', 'report structure', 'pipeline architecture', 'scope decisions'],
        confidence: 'high'
      },
      {
        workType: 'research',
        agents: ['@kima', '@bunk'],
        examples: ['source discovery', 'content scouting', 'community monitoring', 'API research'],
        confidence: 'high'
      },
      {
        workType: 'testing',
        agents: ['@mcnulty'],
        examples: ['unit tests', 'integration tests', 'output validation'],
        confidence: 'high'
      },
      {
        workType: 'documentation',
        agents: ['@freamon'],
        examples: ['README updates', 'report formatting', 'taxonomy docs'],
        confidence: 'high'
      },
      {
        workType: 'refactoring',
        agents: ['@mcnulty'],
        examples: ['code cleanup', 'type improvements', 'pipeline optimization'],
        confidence: 'high'
      },
      {
        workType: 'triage',
        agents: ['@freamon'],
        examples: ['issue triage', 'priority assessment', 'scope evaluation'],
        confidence: 'high'
      }
    ],
    governance: {
      eagerByDefault: true,
      scribeAutoRuns: false,
      allowRecursiveSpawn: false
    }
  },
  
  casting: {
    allowlistUniverses: [
      'The Usual Suspects',
      'Breaking Bad',
      'The Wire',
      'Firefly'
    ],
    overflowStrategy: 'generic',
    universeCapacity: {
      'The Usual Suspects': 6,
      'Breaking Bad': 15,
      'The Wire': 20,
      'Firefly': 10
    }
  },
  
  platforms: {
    vscode: {
      disableModelSelection: false,
      scribeMode: 'sync'
    }
  }
};

export default config;
