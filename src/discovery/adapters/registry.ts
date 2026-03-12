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

    // Skip invalid adapters before execution
    const validAdapters: [string, SourceAdapter][] = [];
    for (const [name, adapter] of this.adapters.entries()) {
      const validation = validations.get(name);
      if (!validation || !validation.valid) {
        skipped.push(name);
        console.log(`  ⏭️  Skipping ${adapter.displayName}: ${validation?.reason ?? 'validation failed'}`);
        continue;
      }
      if (validation.warnings && validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          console.log(`  ⚠️  ${adapter.displayName}: ${warning}`);
        }
      }
      validAdapters.push([name, adapter]);
    }

    // Execute valid adapters in parallel — Promise.allSettled handles isolation
    const startTimes = new Map<string, number>();
    const promises = validAdapters.map(([name, adapter]) => {
      startTimes.set(name, Date.now());
      return adapter.discover(state).then(results => ({ name, results }));
    });

    const settled = await Promise.allSettled(promises);

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const [name, adapter] = validAdapters[i];
      const elapsed = Date.now() - (startTimes.get(name) ?? Date.now());
      timing.set(name, elapsed);

      if (result.status === 'fulfilled') {
        allResults.push(...result.value.results);
      } else {
        const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
        errors.set(name, error);
        console.error(`  ❌ ${adapter.displayName} failed: ${error.message}`);
      }
    }

    return { results: allResults, errors, skipped, timing };
  }
}
