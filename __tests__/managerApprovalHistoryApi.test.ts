const mockGet = jest.fn();

jest.mock("@/api/httpClient", () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

import { requestApiService } from "@/services/api/requestApiService";

describe("approval-history API request", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("serializes date filters together with status and pagination", async () => {
    mockGet.mockResolvedValueOnce({ data: [], pagination: {} });

    await requestApiService.getApprovalHistory({
      status: "rejected",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      page: 2,
      limit: 20,
    });

    const requestedUrl = mockGet.mock.calls[0][0] as string;
    const query = new URL(requestedUrl, "https://example.test").searchParams;
    expect(Object.fromEntries(query.entries())).toEqual({
      status: "rejected",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      page: "2",
      limit: "20",
    });
  });
});