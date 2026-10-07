import type { QueryClient } from '@tanstack/react-query';
import { invalidateMovementSummaries } from '@/hooks/queries/invalidateMovementSummaries';

type Subscription = { remove(): void };
type NetworkState = { isConnected?: boolean; isInternetReachable?: boolean };
export interface MovementLifecycleEvents {
  currentState: string | null;
  onAppState(listener: (state: string) => void): Subscription;
  onNetwork(listener: (state: NetworkState) => void): Subscription;
  getNetwork(): Promise<NetworkState>;
}

/** Event-driven native bridge; no polling, new queries or global refetch policy changes. */
export function subscribeMovementRefresh(client: QueryClient, events: MovementLifecycleEvents) {
  let active = events.currentState === 'active';
  let online: boolean | undefined;
  let disposed = false;
  let networkRevision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (disposed || !active || online === false || timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || !active || online === false) return;
      void invalidateMovementSummaries(client);
    }, 250);
  };
  const updateNetwork = (state: NetworkState, initial = false) => {
    if (disposed) return;
    const next = state.isConnected === false || state.isInternetReachable === false
      ? false : state.isConnected === true ? true : undefined;
    const reconnected = online === false && next === true;
    online = next;
    if (!initial && reconnected) schedule();
  };
  const network = events.onNetwork(state => { networkRevision++; updateNetwork(state); });
  const app = events.onAppState(state => {
    const resumed = !active && state === 'active';
    active = state === 'active';
    if (resumed) schedule();
  });
  const revision = networkRevision;
  void events.getNetwork().then(state => {
    if (revision === networkRevision) updateNetwork(state, true);
  }).catch(() => { /* Unknown connectivity: foreground refetch still works. */ });
  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    app.remove();
    network.remove();
  };
}
