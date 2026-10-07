import type { QueryClient } from '@tanstack/react-query';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';
import { readMovementDisplay, type MovementSummarySource } from '@/utils/movementSummary';

const revisions = new WeakMap<QueryClient, Map<string, number>>();
export function beginMovement(client: QueryClient, id: string) {
  let entries = revisions.get(client);
  if (!entries) { entries = new Map(); revisions.set(client, entries); }
  const revision = (entries.get(id) ?? 0) + 1;
  entries.set(id, revision);
  return { id, revision, started: Date.now() };
}
export type MovementWrite = ReturnType<typeof beginMovement>;

/** Patch only existing, idle detail caches. Never replace history, status or presence.
 * A newer mutation/read owns its state; invalidation still obtains canonical data.
 */
export function applyMovementResult(client: QueryClient, data: MovementSummarySource, write?: MovementWrite) {
  if (!MOVEMENT_SUMMARY_ENABLED || !write || revisions.get(client)?.get(write.id) !== write.revision) return;
  const state = readMovementDisplay(data).state;
  if (!['supported', 'restricted', 'temporarily-unavailable'].includes(state)) return;
  for (const key of [['requests', 'visit-detail', write.id], ['security', 'visitor', write.id]]) {
    const cached = client.getQueryState(key);
    if (!cached?.data || cached.fetchStatus !== 'idle' || cached.dataUpdatedAt > write.started) continue;
    client.setQueryData(key, (old: any) => old ? {
      ...old,
      movementSummary: state === 'supported' ? data.movementSummary : undefined,
      movementSummaryAvailability: data.movementSummaryAvailability,
      movementSummaryError: data.movementSummaryError,
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
    } : old);
  }
}
