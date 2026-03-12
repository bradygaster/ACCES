/**
 * SourceAdapter pattern types — inspired by Squad SDK SkillSource pattern.
 * Enables pluggable discovery sources with graceful degradation.
 */

import type { Channel, DiscoveryResult, RunState } from '../../types.js';

export interface AdapterValidation {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}

export interface SourceAdapter {
  readonly name: string;
  readonly displayName: string;
  readonly channel: Channel;
  validate(): Promise<AdapterValidation>;
  discover(state: RunState): Promise<DiscoveryResult[]>;
}

export interface RegistryResult {
  results: DiscoveryResult[];
  errors: Map<string, Error>;
  skipped: string[];
  timing: Map<string, number>;
}
