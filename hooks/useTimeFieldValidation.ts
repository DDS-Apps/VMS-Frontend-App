import { useCallback, useState } from 'react';

/** Invalid web drafts must not submit the last committed (now stale) value. */
export function useTimeFieldValidation() {
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const reportTimeValidity = useCallback((field: string, valid: boolean) => {
    setInvalid(previous => previous[field] === !valid
      ? previous
      : { ...previous, [field]: !valid });
  }, []);
  return { reportTimeValidity, hasInvalidTimes: Object.values(invalid).some(Boolean) };
}
