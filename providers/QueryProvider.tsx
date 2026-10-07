import React, { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Platform, AppState } from 'react-native';
import { MOVEMENT_SUMMARY_ENABLED } from '@/constants/movementSummary';
import { subscribeMovementRefresh } from './movementRefreshLifecycle';
import { isUnauthorizedError, isApiError } from '@/api/errors';
import { showLocalizedError } from '@/utils/globalToast';

function shouldShowErrorToast(error: unknown): boolean {
  if (isUnauthorizedError(error)) {
    return false;
  }
  if (isApiError(error) && error.code === 'CANCELLED') {
    return false;
  }
  return true;
}

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (!shouldShowErrorToast(error)) {
      return;
    }
    
    showLocalizedError(error);
    
    // The transport records sanitized diagnostics. Raw Axios errors and query
    // keys can contain authorization headers, visitor details and form values.
  },
});

const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: Platform.OS === 'web',
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  useEffect(() => {
    if (!MOVEMENT_SUMMARY_ENABLED || Platform.OS === 'web') return;
    // Defer native-module evaluation until rollout; activating requires a new native build.
    const Network = require('expo-network') as typeof import('expo-network');
    return subscribeMovementRefresh(queryClient, {
      currentState: AppState.currentState,
      onAppState: listener => AppState.addEventListener('change', listener),
      onNetwork: Network.addNetworkStateListener,
      getNetwork: Network.getNetworkStateAsync,
    });
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
