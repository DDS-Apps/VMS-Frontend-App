import { useRef } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

/** Prevent two presses in the same render from submitting approval twice. */
export function useSingleFlightApprovalMutation<TData, TVariables>(
  options: UseMutationOptions<TData, Error, TVariables>,
) {
  const sending = useRef(false);
  const mutation = useMutation({
    ...options,
    onSettled: (...args) => {
      sending.current = false;
      return options.onSettled?.(...args);
    },
  });
  return {
    ...mutation,
    mutate: (variables: TVariables, callbacks?: Parameters<typeof mutation.mutate>[1]) => {
      if (sending.current) return;
      sending.current = true;
      mutation.mutate(variables, callbacks);
    },
    mutateAsync: (variables: TVariables, callbacks?: Parameters<typeof mutation.mutateAsync>[1]) => {
      if (sending.current) return Promise.reject(new Error("Approval is already in progress."));
      sending.current = true;
      return mutation.mutateAsync(variables, callbacks);
    },
  };
}
