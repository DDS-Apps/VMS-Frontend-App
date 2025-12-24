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
  getTimezoneLabel: () => string;
  getServerNow: () => Date;
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

  // API formatters: use Intl.DateTimeFormat with server timezone
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

  // Display formatters: format picker date showing server timezone
  // Uses Intl.DateTimeFormat with timeZone option
  const formatDateForDisplay = useCallback(
    (date: Date, isRTL: boolean = false): string => {
      try {
        return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          timeZone: serverTimezone,
          month: 'short',
          day: 'numeric',
        });
      } catch (error) {
        return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    },
    [serverTimezone]
  );

  const formatTimeForDisplay = useCallback(
    (date: Date, isRTL: boolean = false): string => {
      try {
        return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
          timeZone: serverTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } catch (error) {
        return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    },
    [serverTimezone]
  );

  // Get short timezone label for display (e.g., "Riyadh Time")
  const getTimezoneLabel = useCallback((): string => {
    // Extract city name from timezone ID (e.g., "Asia/Riyadh" -> "Riyadh")
    const parts = serverTimezone.split('/');
    const city = parts[parts.length - 1].replace(/_/g, ' ');
    return `${city} Time`;
  }, [serverTimezone]);

  // Get current time as server-aligned Date (hours/minutes represent server TZ)
  // Use this to initialize picker state
  const getServerNow = useCallback((): Date => {
    const now = new Date();
    // Get current time in server timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: serverTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10) - 1;
    const day = parseInt(getPart('day'), 10);
    const hours = parseInt(getPart('hour'), 10);
    const minutes = parseInt(getPart('minute'), 10);
    const seconds = parseInt(getPart('second'), 10);
    
    // Create Date with these hours/minutes in device-local interpretation
    // This means getHours() will return server TZ hours
    return new Date(year, month, day, hours, minutes, seconds);
  }, [serverTimezone]);

  const parseDateTime = useCallback(
    (dateStr: string, timeStr: string): Date => {
      return parseServerDateTimeStrings(dateStr, timeStr, serverTimezone);
    },
    [serverTimezone]
  );

  const getNowForPicker = useCallback((): Date => {
    return getServerNowForPicker(serverTimezone);
  }, [serverTimezone]);

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
      getTimezoneLabel,
      getServerNow,
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
      getTimezoneLabel,
      getServerNow,
      parseDateTime,
      getNowForPicker,
      getDateParts,
      createDate,
    ]
  );
}
