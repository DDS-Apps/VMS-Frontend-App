import type { ListBuffetAdminTasksParams } from "@/types/api.types";
import { enumerateInclusiveDateKeys } from "@/utils/adminAllRequestsDateRange";

const RANGE_REQUEST_CONCURRENCY = 4;

export function getBuffetSingleDateParams(
  date?: string,
): ListBuffetAdminTasksParams | undefined {
  return date ? { date } : undefined;
}

export function getAdminDatePickerMode(
  requestType: string,
): "single" | "range" {
  return requestType === "buffet" ? "single" : "range";
}

export function extractAllRequestsArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "data" in data) {
    const nested = (data as { data: unknown }).data;
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object" && "data" in nested) {
      const deepNested = (nested as { data: unknown }).data;
      if (Array.isArray(deepNested)) return deepNested;
    }
  }
  return [];
}

export async function fetchValetTasksForDateRange<T extends { id: string }>(
  startDate: string | undefined,
  endDate: string | undefined,
  fetchDate: (date?: string) => Promise<unknown>,
): Promise<T[]> {
  if (!startDate) {
    return extractAllRequestsArray<T>(await fetchDate());
  }

  const dateKeys = enumerateInclusiveDateKeys(startDate, endDate ?? startDate);
  const tasks: T[] = [];
  for (
    let offset = 0;
    offset < dateKeys.length;
    offset += RANGE_REQUEST_CONCURRENCY
  ) {
    const batch = dateKeys.slice(offset, offset + RANGE_REQUEST_CONCURRENCY);
    const responses = await Promise.all(batch.map((date) => fetchDate(date)));
    responses.forEach((response) =>
      tasks.push(...extractAllRequestsArray<T>(response)),
    );
  }

  return Array.from(new Map(tasks.map((task) => [task.id, task])).values());
}

export function getNextVisitPageParam(lastPage: {
  pagination?: {
    page?: number | string;
    totalPages?: number | string;
  };
}): number | undefined {
  const page = Number(lastPage.pagination?.page ?? 1);
  const totalPages = Number(lastPage.pagination?.totalPages ?? 1);
  return page < totalPages ? page + 1 : undefined;
}

export function shouldFetchNextVisitPage({
  requestType,
  hasNextPage,
  isFetchingNextPage,
  hasNextPageError = false,
  viewportHeight,
  scrollOffset,
  contentHeight,
  threshold = 320,
}: {
  requestType: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  hasNextPageError?: boolean;
  viewportHeight: number;
  scrollOffset: number;
  contentHeight: number;
  threshold?: number;
}): boolean {
  if (
    !["visitor", "all"].includes(requestType) ||
    !hasNextPage ||
    isFetchingNextPage ||
    hasNextPageError
  ) {
    return false;
  }
  return contentHeight - viewportHeight - scrollOffset < threshold;
}

export function shouldAutoFetchAllVisitorPages({
  requestType,
  status,
  searchQuery,
  hasNextPage,
  isFetchingNextPage,
  hasNextPageError = false,
}: {
  requestType: string;
  status: string;
  searchQuery?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  hasNextPageError?: boolean;
}): boolean {
  const hasClientFilter = status !== "all" || Boolean(searchQuery?.trim());
  return (
    ["visitor", "all"].includes(requestType) &&
    hasClientFilter &&
    hasNextPage &&
    !isFetchingNextPage &&
    !hasNextPageError
  );
}
