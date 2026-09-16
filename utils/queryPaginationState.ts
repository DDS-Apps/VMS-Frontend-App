export type AutomaticPageFetchState = {
  hasNextPage: boolean | undefined;
  isFetching: boolean;
  isFetchNextPageError: boolean;
};

export function canAutomaticallyFetchNextPage({
  hasNextPage,
  isFetching,
  isFetchNextPageError,
}: AutomaticPageFetchState): boolean {
  return !!hasNextPage && !isFetching && !isFetchNextPageError;
}