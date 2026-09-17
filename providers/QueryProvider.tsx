import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Platform } from 'react-native';
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
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
