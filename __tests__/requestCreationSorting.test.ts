import fs from "fs";
import path from "path";

const mockGet = jest.fn();
jest.mock("@/api/httpClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

import { requestApiService } from "@/services/api/requestApiService";

const source = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("backend-default request creation ordering", () => {
  beforeEach(() => mockGet.mockReset());

  it.each(["visits", "history"])(
    "%s omits sorting on every page without reordering responses",
    async (endpoint) => {
      const list =
        endpoint === "visits"
          ? requestApiService.listVisits
          : requestApiService.getApprovalHistory;
      // Equal creation times intentionally have reverse-ID order supplied by
      // the server; scheduled dates and updates must not override that order.
      const rows = [
        { id: "z", createdAt: "2026-09-11T10:00:00Z", visitDate: "2026-09-01" },
        { id: "a", createdAt: "2026-09-11T10:00:00Z", visitDate: "2026-12-01" },
        { id: "old", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-12T10:00:00Z" },
      ];
      for (const page of [1, 2]) {
        const response = {
          data: page === 1 ? rows.slice(0, 2) : rows.slice(2),
          pagination: { page, totalPages: 2 },
        };
        mockGet.mockResolvedValueOnce(response);
        expect(await list({
          page,
          limit: 20,
          search: "Example",
          startDate: "2026-09-01",
        })).toBe(response);
        const url = new URL(mockGet.mock.calls[page - 1][0], "https://example.test");
        expect(Object.fromEntries(url.searchParams)).toEqual({
          page: String(page),
          limit: "20", search: "Example", startDate: "2026-09-01",
        });
      }
    },
  );

  it("does not add sorting to shared service callers that omit it", async () => {
    for (const list of [
      requestApiService.listVisits,
      requestApiService.getApprovalHistory,
      requestApiService.listReceptionRequests,
    ]) {
      await list({ page: 1, limit: 20 });
      const url = new URL(mockGet.mock.calls.at(-1)![0], "https://example.test");
      expect(Object.fromEntries(url.searchParams)).toEqual({ page: "1", limit: "20" });
    }
  });

  it("uses backend defaults at the two screens without client-side sorting", () => {
    for (const file of [
      "screens/Employee/VisitorRequestsScreen.tsx",
      "screens/Manager/ManagerAllRequestsScreen.tsx",
    ]) {
      const text = source(file);
      expect(text).not.toContain("sortBy:");
      expect(text).not.toContain("sortOrder:");
      expect(text).not.toMatch(/\.(sort|reverse|toSorted)\(/);
    }
    expect(source("screens/Employee/VisitorRequestsScreen.tsx"))
      .toContain("myRequestsOnly: true");
  });

  it("shared infinite queries key and forward caller params rather than inject ordering", () => {
    const text = source("hooks/queries/useApprovalQueries.ts");
    expect(text).toContain("requestKeys.visits(params)");
    expect(text).toContain("approvalHistoryKeys.list(params)");
    expect(text).toMatch(/listVisits\(\s*\{ \.\.\.params, page: pageParam/);
    expect(text).toMatch(/getApprovalHistory\(\{\s*\.\.\.params,/);
    expect(text).not.toContain("sortBy:");
    expect(text).not.toContain("sortOrder:");
  });
});