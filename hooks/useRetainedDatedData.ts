import { useEffect, useState } from "react";

type DatedData<T> = {
  dateKey: string;
  data: T;
};

export type RetainedDatedData<T> = {
  dateKey: string;
  data: T | undefined;
  isRetained: boolean;
};

export function useRetainedDatedData<T>(
  activeDateKey: string,
  activeData: T | undefined,
): RetainedDatedData<T> {
  const [lastSuccessful, setLastSuccessful] = useState<DatedData<T> | null>(
    null,
  );

  useEffect(() => {
    if (activeData === undefined) return;

    setLastSuccessful((current) => {
      if (current?.dateKey === activeDateKey && current.data === activeData) {
        return current;
      }

      return {
        dateKey: activeDateKey,
        data: activeData,
      };
    });
  }, [activeData, activeDateKey]);

  if (activeData !== undefined) {
    return {
      dateKey: activeDateKey,
      data: activeData,
      isRetained: false,
    };
  }

  if (lastSuccessful) {
    return {
      ...lastSuccessful,
      isRetained: true,
    };
  }

  return {
    dateKey: activeDateKey,
    data: undefined,
    isRetained: false,
  };
}
