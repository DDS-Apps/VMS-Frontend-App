import fs from "fs";
import path from "path";
import React from "react";
import { act, create } from "react-test-renderer";

import { useRetainedDatedData } from "../hooks/useRetainedDatedData";

const screenPath = path.resolve(
  __dirname,
  "../screens/Buffet/BuffetBoardScreen.tsx",
);
const queryHookPath = path.resolve(
  __dirname,
  "../hooks/queries/useBuffetQueries.ts",
);
const screenSource = fs.readFileSync(screenPath, "utf8");
const queryHookSource = fs.readFileSync(queryHookPath, "utf8");

describe("BuffetBoardScreen retained loading states", () => {
  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it("clears overlapping task IDs independently in either completion order and on failure", async () => {
    const pending = new Set<string>();
    let successfulRefetches = 0;
    const invoke = async (taskId: string, request: Promise<void>) => {
      pending.add(taskId);
      try {
        await request;
        successfulRefetches += 1;
      } catch {
        // The screen logs the request error; this probe verifies cleanup.
      } finally {
        pending.delete(taskId);
      }
    };

    const first = deferred<void>();
    const second = deferred<void>();
    const firstRun = invoke("task-a", first.promise);
    const secondRun = invoke("task-b", second.promise);
    expect(pending).toEqual(new Set(["task-a", "task-b"]));

    second.resolve();
    await secondRun;
    expect(pending).toEqual(new Set(["task-a"]));
    first.resolve();
    await firstRun;
    expect(pending.size).toBe(0);

    const third = deferred<void>();
    const fourth = deferred<void>();
    const thirdRun = invoke("task-c", third.promise);
    const fourthRun = invoke("task-d", fourth.promise);
    third.reject(new Error("failed"));
    await thirdRun;
    expect(pending).toEqual(new Set(["task-d"]));
    fourth.resolve();
    await fourthRun;
    expect(pending.size).toBe(0);
    expect(successfulRefetches).toBe(3);

    const fifth = deferred<void>();
    const sixth = deferred<void>();
    const fifthRun = invoke("task-e", fifth.promise);
    const sixthRun = invoke("task-f", sixth.promise);
    fifth.resolve();
    await fifthRun;
    expect(pending).toEqual(new Set(["task-f"]));
    sixth.resolve();
    await sixthRun;
    expect(pending.size).toBe(0);
    expect(successfulRefetches).toBe(5);
  });

  it("keeps the successful source through pending and failure, then accepts successful empty", () => {
    type Context =
      | { selection: "date"; date: string; status: string }
      | {
          selection: "range";
          startDate: string;
          endDate: string;
          status: string;
        };
    type RetainedInput = { response: string[]; context: Context };

    let context: Context = {
      selection: "date",
      date: "2026-04-08",
      status: "pending",
    };
    let response: string[] | undefined = ["task-a"];
    let retained!: ReturnType<typeof useRetainedDatedData<RetainedInput>>;

    const Probe = () => {
      const active = React.useMemo(
        () => response !== undefined ? { response, context } : undefined,
        [context, response],
      );
      retained = useRetainedDatedData(JSON.stringify(context), active);
      return null;
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(Probe));
    });
    expect(retained.data).toEqual({
      response: ["task-a"],
      context: {
        selection: "date",
        date: "2026-04-08",
        status: "pending",
      },
    });
    expect(retained.isRetained).toBe(false);

    context = {
      selection: "range",
      startDate: "2026-04-10",
      endDate: "2026-04-12",
      status: "ready",
    };
    response = undefined;
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data?.response).toEqual(["task-a"]);
    expect(retained.dateKey).toContain("2026-04-08");
    expect(retained.isRetained).toBe(true);

    // A failed request still supplies no active successful input.
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data?.response).toEqual(["task-a"]);
    expect(retained.isRetained).toBe(true);

    response = [];
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data).toEqual({ response: [], context });
    expect(retained.dateKey).toBe(JSON.stringify(context));
    expect(retained.isRetained).toBe(false);

    act(() => renderer.unmount());
  });

  it("accepts defined active-key cache data and stores it with exact source context", () => {
    expect(screenSource).toContain("isFetching,\n    isError");
    expect(screenSource).toContain("() => tasksResponse !== undefined");
    expect(screenSource).toContain(
      "? { response: tasksResponse ?? [], context: sourceContext }",
    );
    expect(screenSource).toContain("JSON.stringify(sourceContext)");
    expect(screenSource).toContain("selection: 'date'");
    expect(screenSource).toContain("selection: 'range'");
    expect(screenSource).toContain(
      "startDate: formatDateForApi(dateRange.startDate)",
    );
    expect(screenSource).toContain(
      "endDate: formatDateForApi(dateRange.endDate)",
    );
    expect(screenSource).toContain("status: statusFilter");
  });

  it("derives rows, source-associated range filtering, counts, and cards from the displayed response", () => {
    expect(screenSource).toContain(
      "const displayedResponse = retainedTasks.data?.response;",
    );
    expect(screenSource).toContain(
      "const allTasks: BuffetStaffTaskDto[] = displayedResponse ?? [];",
    );
    expect(screenSource).toMatch(
      /const tasks = displayedSourceContext\.selection === 'range'[\s\S]*?allTasks\.filter/,
    );
    expect(screenSource).toContain(
      "task.visitDate >= displayedSourceContext.startDate",
    );
    expect(screenSource).toContain(
      "task.visitDate <= displayedSourceContext.endDate",
    );
    expect(screenSource).toContain("all: tasks.length");
    expect(screenSource).toContain("const filteredTasks = tasks");
    expect(screenSource).toContain("filteredTasks.map(renderTaskCard)");
  });

  it("labels the retained exact date or range and localized server status", () => {
    expect(screenSource).toContain(
      "`${displayedSourceContext.startDate} – ${displayedSourceContext.endDate}`",
    );
    expect(screenSource).toContain(": displayedSourceContext.date");
    expect(screenSource).toContain(
      "option.key === displayedSourceContext.status",
    );
    expect(screenSource).toContain(
      "t('requests.showingPreviousDataFrom').replace('{{source}}', displayedSourceLabel)",
    );
  });

  it("keeps cold and warm guards source-safe and gates retry while fetching", () => {
    expect(screenSource).toContain(
      "if (!hasDisplayedData && (isFetching || isLoading))",
    );
    expect(screenSource).toContain("if (!hasDisplayedData && isError)");
    expect(screenSource).toContain(
      "hasDisplayedData && (isFetching || isError || retainedTasks.isRetained)",
    );
    expect(screenSource).toContain("isError && !isFetching ?");
    expect(screenSource).toContain("if (!isFetching) refetch();");
    expect(screenSource).toContain("disabled={isFetching}");
    expect(screenSource).toContain("styles.inlineFeedback");
  });

  it("memoizes the existing request params and leaves query API semantics untouched", () => {
    const myTasksHookSource = queryHookSource.match(
      /export function useMyBuffetTasksQuery[\s\S]*?\n}\n/,
    )?.[0];
    expect(myTasksHookSource).toBeDefined();
    expect(screenSource).toMatch(
      /const queryParams = useMemo\(\(\) => \(\{\s*date: queryDate,\s*status: statusFilter !== 'all' \? statusFilter : undefined,\s*\}\), \[queryDate, statusFilter\]\)/,
    );
    expect(myTasksHookSource).toContain("queryKey: buffetKeys.myTasks(params)");
    expect(myTasksHookSource).toContain(
      "queryFn: () => buffetApiService.getMyBuffetTasks(params)",
    );
    expect(myTasksHookSource).toContain(
      "export function useMyBuffetTasksQuery(params?: ListBuffetStaffTasksParams, enabled = true)",
    );
    expect(myTasksHookSource).not.toMatch(
      /staleTime|refetchInterval|placeholderData/,
    );
  });

  it("preserves refresh, mutation concurrency, explicit refetch, formatting, order, filters, and privacy", () => {
    expect(screenSource).toContain("refreshing={isRefetching}");
    expect(screenSource).toContain("onRefresh={refetch}");
    expect(screenSource).toContain("const [updatingTaskIds, setUpdatingTaskIds]");
    expect(screenSource).toContain("setUpdatingTaskIds((current) => new Set(current).add(taskId));");
    expect(screenSource).toContain("next.delete(taskId);");
    expect(screenSource).not.toContain("setUpdatingTaskId(null)");
    expect(screenSource).toContain("await updateStatusMutation.mutateAsync({");
    expect(screenSource).toMatch(/await updateStatusMutation\.mutateAsync\([\s\S]*?\);\s*refetch\(\);/);
    expect(screenSource).toContain("} finally {");
    expect(screenSource).toContain("const year = date.getFullYear();");
    expect(screenSource).toContain("`${visitDate}T${cleaned}+03:00`");
    expect(screenSource).toContain(
      "return statusOrder[a.status] - statusOrder[b.status];",
    );
    expect(screenSource).toContain("return dateB - dateA;");
    expect(screenSource).toContain("task.hostName.toLowerCase().includes");
    expect(screenSource).toContain(
      "task.visitDate >= displayedSourceContext.startDate",
    );
    expect(screenSource).not.toMatch(/\btask\.visitorName\b/);
  });
});
