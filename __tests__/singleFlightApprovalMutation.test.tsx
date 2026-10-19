import React from "react";
import { act, create } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSingleFlightApprovalMutation } from "@/hooks/useSingleFlightApprovalMutation";

describe("approval submission lock", () => {
  it("blocks duplicate presses before rerender and allows another request after settlement", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
    let finish!: (value: string) => void;
    const submit = jest.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    let mutation!: ReturnType<typeof useSingleFlightApprovalMutation<string, string>>;
    function Harness() {
      mutation = useSingleFlightApprovalMutation({ mutationFn: submit });
      return null;
    }
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
    });
    await act(async () => {
      mutation.mutate("one");
      mutation.mutate("one");
      await Promise.resolve();
    });
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => { finish("done"); await Promise.resolve(); });
    await act(async () => { mutation.mutate("two"); await Promise.resolve(); });
    expect(submit).toHaveBeenCalledTimes(2);
    await act(async () => { finish("done"); await Promise.resolve(); });
    act(() => renderer.unmount());
    client.clear();
  });
});
