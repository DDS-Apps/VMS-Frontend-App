import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_SERVER_TIMEZONE,
  convertPickerToServerDate,
  convertServerDateToPicker,
  toServerDateString,
  toServerTimeString,
  toServerTime24String,
  parseServerDateTimeStrings,
  getServerNowForPicker,
  getServerDateParts,
  createServerDate,
} from '@/services/utils/dateTimeUtils';

export interface ServerDateTime {
  serverTimezone: string;
  toServerDate: (pickerDate: Date) => Date;
  toPickerDate: (serverDate: Date) => Date;
  formatDateForApi: (date: Date) => string;
  formatTimeForApi: (date: Date) => string;
  formatTime24ForApi: (date: Date) => string;
  formatDateForDisplay: (date: Date, isRTL?: boolean) => string;
  formatTimeForDisplay: (date: Date, isRTL?: boolean) => string;
  parseDateTime: (dateStr: string, timeStr: string) => Date;
  getNowForPicker: () => Date;
  getDateParts: (date: Date) => { year: number; month: number; day: number; hours: number; minutes: number };
  createDate: (year: number, month: number, day: number, hours?: number, minutes?: number) => Date;
}

export function useServerDateTime(): ServerDateTime {
  const { user } = useAuth();
  const serverTimezone = user?.timezone || DEFAULT_SERVER_TIMEZONE;

  const toServerDate = useCallback(
    (pickerDate: Date): Date => {
      return convertPickerToServerDate(pickerDate, serverTimezone);
    },
    [serverTimezone]
  );

  const toPickerDate = useCallback(
    (serverDate: Date): Date => {
      return convertServerDateToPicker(serverDate, serverTimezone);
    },
    [serverTimezone]
  );

  // API formatters: convert to server timezone for API submission
  const formatDateForApi = useCallback(
    (date: Date): string => {
      return toServerDateString(date, serverTimezone);
    },
    [serverTimezone]
  );

  const formatTimeForApi = useCallback(
    (date: Date): string => {
      return toServerTimeString(date, serverTimezone);
    },
    [serverTimezone]
  );

  const formatTime24ForApi = useCallback(
    (date: Date): string => {
      return toServerTime24String(date, serverTimezone);
    },
    [serverTimezone]
  );

  // Display formatters: use device-local time for display
  // Timezone conversion is handled server-side
  const formatDateForDisplay = useCallback(
    (date: Date, isRTL: boolean = false): string => {
      return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    },
    []
  );

  const formatTimeForDisplay = useCallback(
    (date: Date, isRTL: boolean = false): string => {
      return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    },
    []
  );

  const parseDateTime = useCallback(
    (dateStr: string, timeStr: string): Date => {
      return parseServerDateTimeStrings(dateStr, timeStr, serverTimezone);
    },
    [serverTimezone]
  );

  const getNowForPicker = useCallback((): Date => {
    // Return device-local time for picker display
    return new Date();
  }, []);

  const getDateParts = useCallback(
    (date: Date) => {
      return getServerDateParts(date, serverTimezone);
    },
    [serverTimezone]
  );

  const createDate = useCallback(
    (year: number, month: number, day: number, hours: number = 0, minutes: number = 0): Date => {
      return createServerDate(year, month, day, hours, minutes, serverTimezone);
    },
    [serverTimezone]
  );

  return useMemo(
    () => ({
      serverTimezone,
      toServerDate,
      toPickerDate,
      formatDateForApi,
      formatTimeForApi,
      formatTime24ForApi,
      formatDateForDisplay,
      formatTimeForDisplay,
      parseDateTime,
      getNowForPicker,
      getDateParts,
      createDate,
    }),
    [
      serverTimezone,
      toServerDate,
      toPickerDate,
      formatDateForApi,
      formatTimeForApi,
      formatTime24ForApi,
      formatDateForDisplay,
      formatTimeForDisplay,
      parseDateTime,
      getNowForPicker,
      getDateParts,
      createDate,
    ]
  );
}
