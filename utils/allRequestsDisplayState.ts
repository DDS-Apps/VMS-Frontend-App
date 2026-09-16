export function resolveRetainedDisplay<T>(
  current: T | null,
  retained: T | null,
) {
  return {
    snapshot: current ?? retained,
    isRetained: current === null && retained !== null,
  };
}

export function getAllRequestsSourceKey({
  type,
  status,
  searchQuery,
  startDate,
  endDate,
}: {
  type: string;
  status: string;
  searchQuery: string;
  startDate?: string;
  endDate?: string;
}) {
  return JSON.stringify({
    type,
    status,
    searchQuery: searchQuery.toLowerCase(),
    startDate,
    endDate,
  });
}

export function resolvePrimaryListState({
  hasUsableData,
  isLoading,
  isFetching,
  isError,
  isFetchingNextPage,
}: {
  hasUsableData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
}) {
  return {
    showSkeleton: isLoading && !hasUsableData,
    showError: isError && !hasUsableData,
    showRefreshError: isError && hasUsableData,
    isRefreshing: isFetching && !isFetchingNextPage,
  };
}
