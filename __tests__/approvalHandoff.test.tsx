import React from "react";
import { act, create } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import { httpClient, clearTokens } from "@/api/httpClient";
import { requestApiService } from "@/services/api/requestApiService";
import { useApproveVisitMutation, useBulkApproveRequestsMutation, useCancelVisitMutation, requestKeys } from "@/hooks/queries/useApprovalQueries";
import { ApiException, mapAxiosErrorToApiError } from "@/api/errors";
import { getApprovalErrorMessage, getCancellationErrorMessage } from "@/utils/approvalErrorMessage";
import { canUpdateAfterApproval, getApprovalOutcomeMessage } from "@/utils/approvalOutcome";
import { en } from "@/constants/i18n/en";
import { ar } from "@/constants/i18n/ar";
import type { ApproveVisitResponse, VisitDetailsDto } from "@/types/api.types";

jest.mock("@/hooks/queries/useInvitationQueries", () => ({ invitationKeys: { all: ["invitations"] } }));
jest.mock("@/hooks/queries/useDashboardKpiQuery", () => ({ invalidateDashboardKpis: jest.fn() }));
jest.mock("@/hooks/useActiveVisitView", () => ({ useActiveVisitView: () => true }));
jest.mock("@/hooks/queries/useVisitMovementHistory", () => ({ useVisitMovementHistory: jest.fn() }));
jest.mock("@/hooks/queries/useQrHistoryData", () => ({ useQrHistoryData: jest.fn() }));

const fixtures = require("./fixtures/approval-handoff.json");
const translate = (language: typeof en) => (key: string): string =>
  key.split(".").reduce((value: any, part) => value?.[part], language) ?? key;

describe("serialized approval handoff through real HTTP service and mutation hooks", () => {
  let body: any;
  let status: number;
  let client: QueryClient;
  let renderer: ReturnType<typeof create> | undefined;
  const sent: string[] = [];
  const originalAdapter = httpClient.defaults.adapter;
  beforeEach(() => {
    sent.length = 0;
    clearTokens();
    status = 200;
    body = fixtures.single;
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 3, gcTime: Infinity } } });
    httpClient.defaults.adapter = async config => {
      sent.push(`${config.method} ${config.url}`);
      const response: AxiosResponse = {
        data: JSON.parse(JSON.stringify(body)), status, statusText: String(status), headers: {}, config,
      };
      if (status >= 400) throw new AxiosError("Fixture error", "ERR_BAD_RESPONSE", config, {}, response);
      return response;
    };
  });
  afterEach(() => {
    if (renderer) act(() => renderer!.unmount());
    renderer = undefined;
    client.clear();
    httpClient.defaults.adapter = originalAdapter;
  });
  function mount(useHook: () => any) {
    let mutation: any;
    function Harness() { mutation = useHook(); return null; }
    act(() => { renderer = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
    return () => mutation;
  }

  it.each(["single", "pending", "cancelled"])("accepts direct %s response without requiring a QR or legacy reminders", async name => {
    body = fixtures[name];
    const getMutation = mount(useApproveVisitMutation);
    const key = requestKeys.visitDetail(body.id);
    client.setQueryData(key, { id: body.id, status: "pending_approval", visitor: { fullName: "Test" }, qrValidity: { expired: true } });
    let response: ApproveVisitResponse | undefined;
    await act(async () => { response = await getMutation().mutateAsync({ id: body.id }); });
    expect(response).toEqual(body);
    expect(response?.qrCode).toBeUndefined();
    expect(response?.reminders).toBeUndefined();
    expect(client.getQueryData<VisitDetailsDto>(key)?.status).toBe(body.status);
    expect(client.getQueryData<any>(key)?.qrValidity).toEqual({ expired: true });
    expect(sent).toEqual([`post /api/v1/visits/${body.id}/approve`]);
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    if (name !== "single") {
      expect(canUpdateAfterApproval(response!)).toBe(false);
      for (const language of [en, ar]) {
        const message = getApprovalOutcomeMessage(response!, translate(language));
        expect(message).toContain(language.approval.provisioningPending);
        if (name === "cancelled") expect(message).toContain(language.status.cancelled);
      }
    }
  });
  it("does not create a partial detail cache when none exists", async () => {
    const getMutation = mount(useApproveVisitMutation);
    await act(async () => { await getMutation().mutateAsync({ id: body.id }); });
    expect(client.getQueryData(requestKeys.visitDetail(body.id))).toBeUndefined();
  });
  it.each(["expired", "invalid", "processed"])("preserves %s machine code, refreshes and never workflow-retries", async name => {
    body = fixtures[name]; status = body.statusCode;
    client.setQueryData(requestKeys.visitDetail("v1"), { status: "pending_approval" });
    const getMutation = mount(useApproveVisitMutation);
    let failure: any;
    await act(async () => {
      try { await getMutation().mutateAsync({ id: "v1" }); } catch (error) { failure = error; }
    });
    expect(failure).toBeInstanceOf(ApiException);
    expect(failure.backendCode).toBe(body.code);
    expect(failure.code).toBe(status === 409 ? "CONFLICT" : "VALIDATION_ERROR");
    expect(sent).toHaveLength(1);
    expect(client.getQueryState(requestKeys.visitDetail("v1"))?.isInvalidated).toBe(true);
    for (const language of [en, ar]) {
      const key = name === "expired" ? "expiredRequest" : name === "invalid" ? "invalidSchedule" : "alreadyProcessed";
      expect(getApprovalErrorMessage(failure, translate(language))).toBe(language.approval[key]);
    }
  });
  it.each(["mixed", "allExpired", "bulkWarning"])("keeps HTTP 200 %s per-item details and committed counts", async name => {
    body = fixtures[name];
    const getMutation = mount(useBulkApproveRequestsMutation);
    let result: any;
    await act(async () => { result = await getMutation().mutateAsync({ ids: body.results.map((row: any) => row.id) }); });
    expect(result).toEqual(body);
    expect(sent).toEqual(["post /api/v1/approvals/bulk/approve"]);
  });
  it("refreshes a cancellation conflict without replaying it, even with global mutation retry enabled", async () => {
    status = 409; body = { message: "Concurrent change", statusCode: 409 };
    client.setQueryData(requestKeys.visitDetail("v1"), { status: "approved" });
    const getMutation = mount(useCancelVisitMutation);
    let failure: any;
    await act(async () => {
      try { await getMutation().mutateAsync("v1"); } catch (error) { failure = error; }
    });
    expect(sent).toEqual(["delete /api/v1/visits/v1"]);
    expect(client.getQueryState(requestKeys.visitDetail("v1"))?.isInvalidated).toBe(true);
    for (const language of [en, ar]) {
      expect(getCancellationErrorMessage(failure, translate(language))).toBe(language.approval.cancellationConflict);
    }
  });
  it.each([401, 403, 404])("keeps existing %s handling rather than trusting a workflow code on an auth/not-found error", async httpStatus => {
    status = httpStatus; body = { ...fixtures.expired, statusCode: httpStatus };
    let failure: any;
    try { await requestApiService.approveVisit("v1"); } catch (error) { failure = error; }
    expect(failure.code).toBe(httpStatus === 401 ? "UNAUTHORIZED" : httpStatus === 403 ? "FORBIDDEN" : "NOT_FOUND");
    expect(getApprovalErrorMessage(failure, translate(en))).not.toBe(en.approval.expiredRequest);
    expect(sent).toHaveLength(1);
  });
  it("does not display unknown/private backend fields or imply a provisioning retry worker", () => {
    const error = new AxiosError("sensitive", undefined, undefined, {}, {
      status: 422, data: { code: "__proto__", message: "private debug detail" }, headers: {}, config: {} as never, statusText: "",
    });
    expect(getApprovalErrorMessage(new ApiException(mapAxiosErrorToApiError(error)), translate(en)))
      .toBe(en.errors.somethingWentWrong);
    const message = getApprovalOutcomeMessage({ ...fixtures.single, status: "private-unknown-status" }, translate(en));
    expect(message).toBe(en.approval.statusChanged);
  });
});
