/**
 * SourceRegistry — central registry for discovery adapters.
 * Executes adapters in parallel via Promise.allSettled for graceful degradation.
 */

import type { DiscoveryResult, RunState } from '../../types.js';
import type { AdapterValidation, RegistryResult, SourceAdapter } from './types.js';

export class SourceRegistry {
  private adapters: Map<string, SourceAdapter> = new Map();

  register(adapter: SourceAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter "${adapter.name}" is already registered`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  async validateAll(): Promise<Map<string, AdapterValidation>> {
    const results = new Map<string, AdapterValidation>();
    const promises = Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
      try {
        const validation = await adapter.validate();
        return { name, validation };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { name, validation: { valid: false, reason: `Validation threw: ${message}` } };
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.set(result.value.name, result.value.validation);
      }
    }

    return results;
  }

  async discoverAll(state: RunState): Promise<RegistryResult> {
    const allResults: DiscoveryResult[] = [];
    const errors = new Map<string, Error>();
    const skipped: string[] = [];
    const timing = new Map<string, number>();

    const validations = await this.validateAll();

    const promises = Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
      const validation = validations.get(name);
      if (!validation || !validation.valid) {
        skipped.push(name);
        console.log(`  ⏭️  Skipping ${adapter.displayName}: ${validation?.reason ?? 'validation failed'}`);
        return null;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          console.log(`  ⚠️  ${adapter.displayName}: ${warning}`);
        }
      }

      const start = Date.now();
      try {
        const results = await adapter.discover(state);
        const elapsed = Date.now() - start;
        timing.set(name, elapsed);
        return { name, results };
      } catch (err) {
        const elapsed = Date.now() - start;
        timing.set(name, elapsed);
        const error = err instanceof Error ? err : new Error(String(err));
        errors.set(name, error);
        console.error(`  ❌ ${adapter.displayName} failed: ${error.message}`);
        return null;
      }
    });

    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value.results);
      }
    }

    return { results: allResults, errors, skipped, timing };
  }
}
