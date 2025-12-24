import { useCallback, useMemo } from 'react';

export interface ServerDateTime {
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
  // All formatters use device-local time
  // Server handles all timezone conversion on receipt

  // API formatters: format device-local time for API submission
  // Server will normalize to its timezone
  const formatDateForApi = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const formatTimeForApi = useCallback((date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  }, []);

  const formatTime24ForApi = useCallback((date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  // Display formatters: use device-local time for display
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

  // Parse date/time strings as device-local time
  const parseDateTime = useCallback((dateStr: string, timeStr: string): Date => {
    // Parse date: YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Parse time: "HH:MM AM/PM" or "HH:MM"
    let hours = 0;
    let minutes = 0;
    
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3];
        
        if (period) {
          if (period.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
      }
    }
    
    return new Date(year, month - 1, day, hours, minutes);
  }, []);

  const getNowForPicker = useCallback((): Date => {
    return new Date();
  }, []);

  const getDateParts = useCallback((date: Date) => {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  }, []);

  const createDate = useCallback(
    (year: number, month: number, day: number, hours: number = 0, minutes: number = 0): Date => {
      return new Date(year, month - 1, day, hours, minutes);
    },
    []
  );

  return useMemo(
    () => ({
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
