import React from "react";
import { act, create } from "react-test-renderer";

import { useRetainedDatedData } from "../hooks/useRetainedDatedData";

function renderRetainedDatedDataHook<T>(
  getProps: () => { dateKey: string; data: T | undefined },
) {
  let current!: ReturnType<typeof useRetainedDatedData<T>>;

  const TestComponent = () => {
    const { dateKey, data } = getProps();
    current = useRetainedDatedData(dateKey, data);
    return null;
  };

  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(React.createElement(TestComponent));
  });

  return {
    get current() {
      return current;
    },
    rerender() {
      act(() => {
        renderer.update(React.createElement(TestComponent));
      });
    },
    unmount() {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

describe("useRetainedDatedData", () => {
  it("keeps data associated with its successful source date", () => {
    let props: {
      dateKey: string;
      data: { visitors: string[] } | undefined;
    } = {
      dateKey: "2026-09-09",
      data: { visitors: ["A"] },
    };
    const hook = renderRetainedDatedDataHook(() => props);

    expect(hook.current).toEqual({
      dateKey: "2026-09-09",
      data: { visitors: ["A"] },
      isRetained: false,
    });

    props = { dateKey: "2026-09-10", data: undefined };
    hook.rerender();

    expect(hook.current).toEqual({
      dateKey: "2026-09-09",
      data: { visitors: ["A"] },
      isRetained: true,
    });

    hook.unmount();
  });

  it("keeps retained data through failure and retry until success replaces it", () => {
    let props: {
      dateKey: string;
      data: { visitors: string[] } | undefined;
    } = {
      dateKey: "2026-09-09",
      data: { visitors: ["A"] },
    };
    const hook = renderRetainedDatedDataHook(() => props);

    props = { dateKey: "2026-09-10", data: undefined };
    hook.rerender();
    hook.rerender();
    expect(hook.current.dateKey).toBe("2026-09-09");
    expect(hook.current.isRetained).toBe(true);

    props = {
      dateKey: "2026-09-10",
      data: { visitors: ["B"] },
    };
    hook.rerender();

    expect(hook.current).toEqual({
      dateKey: "2026-09-10",
      data: { visitors: ["B"] },
      isRetained: false,
    });

    hook.unmount();
  });

  it("settles when query params and the retained response wrapper are memoized", () => {
    const response = { visitors: [] as string[] };
    let renderCount = 0;

    const Probe = ({ status }: { status: string }) => {
      const params = React.useMemo(() => ({ status }), [status]);
      const retainedInput = React.useMemo(
        () => ({ response, params }),
        [params],
      );
      useRetainedDatedData(JSON.stringify(params), retainedInput);
      renderCount += 1;
      return null;
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(Probe, { status: "expected" }));
    });
    const settledRenderCount = renderCount;

    act(() => {
      renderer.update(React.createElement(Probe, { status: "expected" }));
    });

    expect(settledRenderCount).toBeLessThanOrEqual(3);
    expect(renderCount - settledRenderCount).toBe(1);

    act(() => {
      renderer.unmount();
    });
  });
});
