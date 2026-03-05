/**
 * State management for ACCES.
 *
 * Persists RunState to `AspireContentEngine/.state/` so that
 * "since last run" logic works across invocations.
 * Uses only node:fs and node:path.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RunState, RunStateSerialized } from './types.js';

const STATE_DIR = join('AspireContentEngine', '.state');
const STATE_FILE = join(STATE_DIR, 'run-state.json');

/** Days to look back on first (bootstrap) run */
const BOOTSTRAP_DAYS = 30;

/**
 * Load persisted run state, or create bootstrap state if none exists.
 * Bootstrap state sets `last_run` to 30 days ago so the first run
 * captures a meaningful window of content.
 */
export async function loadState(): Promise<{ state: RunState; isBootstrap: boolean }> {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    const data: RunStateSerialized = JSON.parse(raw);
    return {
      state: deserialize(data),
      isBootstrap: false,
    };
  } catch {
    // No state file — bootstrap mode
    const bootstrapDate = new Date();
    bootstrapDate.setDate(bootstrapDate.getDate() - BOOTSTRAP_DAYS);

    return {
      state: {
        last_run: bootstrapDate.toISOString(),
        known_ids: new Set<string>(),
        known_dupes: new Map<string, string>(),
      },
      isBootstrap: true,
    };
  }
}

/**
 * Save run state to disk so the next run can compute deltas.
 */
export async function saveState(state: RunState): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const serialized = serialize(state);
  await writeFile(STATE_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
}

// ─── Serialization helpers ──────────────────────────────────────────────────

function serialize(state: RunState): RunStateSerialized {
  return {
    last_run: state.last_run,
    known_ids: [...state.known_ids],
    known_dupes: Object.fromEntries(state.known_dupes),
  };
}

function deserialize(data: RunStateSerialized): RunState {
  return {
    last_run: data.last_run,
    known_ids: new Set(data.known_ids),
    known_dupes: new Map(Object.entries(data.known_dupes)),
  };
}
