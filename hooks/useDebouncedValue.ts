import { useEffect, useState } from 'react';

/**
 * Returns `value` once it has stopped changing for `delayMs`. The first render
 * returns the initial value immediately, so prefilled inputs are not delayed.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (Object.is(debouncedValue, value)) {
      return undefined;
    }
    const handle = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(handle);
    // debouncedValue is intentionally omitted: it only short-circuits a timer
    // for a value that is already settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return debouncedValue;
}
