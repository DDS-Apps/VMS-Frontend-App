export interface DateTimeFormatOptions {
  isRTL?: boolean;
  includeYear?: boolean;
  includeWeekday?: boolean;
  includeTime?: boolean;
}

export const formatDate = (
  dateInput: string | Date,
  options: DateTimeFormatOptions = {}
): string => {
  const { isRTL = false, includeYear = false, includeWeekday = false } = options;
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (includeYear) {
    formatOptions.year = 'numeric';
  }

  if (includeWeekday) {
    formatOptions.weekday = 'short';
  }

  return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', formatOptions);
};

export const formatFullDate = (
  dateInput: string | Date,
  isRTL: boolean = false
): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (
  timeInput: string | Date,
  isRTL: boolean = false
): string => {
  if (typeof timeInput === 'string') {
    if (timeInput.includes('AM') || timeInput.includes('PM')) {
      return timeInput;
    }
    if (timeInput.includes(':') && !timeInput.includes('T')) {
      const [hours, minutes] = timeInput.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${period}`;
    }
    const date = new Date(timeInput);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return timeInput;
  }
  
  return timeInput.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export interface TimestampResult {
  date: string;
  time: string;
  relative: string;
  isToday: boolean;
  isYesterday: boolean;
  diffMins: number;
  diffHours: number;
  diffDays: number;
}

export const formatTimestamp = (
  isoString: string,
  isRTL: boolean = false
): TimestampResult => {
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    return { date: '', time: '', relative: '', isToday: false, isYesterday: false, diffMins: 0, diffHours: 0, diffDays: 0 };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const dateStr = formatDate(date, { isRTL });
  const timeStr = formatTime(date, isRTL);

  return { 
    date: dateStr, 
    time: timeStr, 
    relative: dateStr,
    isToday,
    isYesterday,
    diffMins,
    diffHours,
    diffDays
  };
};

export const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTimeForApi = (time: Date): string => {
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateTime = (
  isoString: string,
  isRTL: boolean = false
): string => {
  const date = new Date(isoString);
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const dateStr = formatDate(date, { isRTL, includeYear: true });
  const timeStr = formatTime(date, isRTL);
  
  return `${dateStr} ${isRTL ? 'في' : 'at'} ${timeStr}`;
};

export interface CountdownResult {
  hours: number;
  minutes: number;
  days: number;
  isPast: boolean;
  isWithin24Hours: boolean;
}

export const getCountdownValues = (targetDate: Date): CountdownResult => {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const hours = Math.floor(absDiffMs / 3600000);
  const minutes = Math.floor((absDiffMs % 3600000) / 60000);
  const days = Math.floor(hours / 24);

  return {
    hours: hours % 24,
    minutes,
    days,
    isPast,
    isWithin24Hours: hours < 24,
  };
};

export const isDatePast = (dateStr: string, timeStr?: string): boolean => {
  const dateTimeStr = timeStr ? `${dateStr} ${timeStr}` : dateStr;
  const date = new Date(dateTimeStr);
  return date < new Date();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

export const getDateRangeFilter = (
  itemDate: string,
  selectedDate: Date,
  dateRange: { startDate: Date; endDate: Date } | null
): boolean => {
  if (dateRange) {
    const start = formatDateForApi(dateRange.startDate);
    const end = formatDateForApi(dateRange.endDate);
    return itemDate >= start && itemDate <= end;
  }
  return itemDate === formatDateForApi(selectedDate);
};

// ===== TIMEZONE UTILITIES =====
// Default server timezone (fallback if not provided)
export const DEFAULT_SERVER_TIMEZONE = 'Asia/Riyadh';

/**
 * Get the current time in the server's timezone
 * @param timezone - Server timezone (e.g., 'Asia/Riyadh')
 * @returns Date object representing current time adjusted for display purposes
 */
export const getServerNow = (timezone: string = DEFAULT_SERVER_TIMEZONE): Date => {
  return new Date();
};

/**
 * Convert a local Date to a date string in server timezone (YYYY-MM-DD format)
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns Date string in YYYY-MM-DD format for the server timezone
 */
export const toServerDateString = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (error) {
    // Fallback to local formatting if timezone is invalid
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Convert a local Date to a time string in server timezone (h:mm AM/PM format, no leading zeros)
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns Time string in h:mm AM/PM format for the server timezone
 */
export const toServerTimeString = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch (error) {
    // Fallback to local formatting
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const minuteStr = String(minutes).padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
  }
};

/**
 * Convert a local Date to ISO datetime string in server timezone
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns ISO-like datetime string for the server timezone
 */
export const toServerISOString = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): string => {
  const dateStr = toServerDateString(date, timezone);
  const timeStr = toServerTimeString(date, timezone);
  return `${dateStr}T${timeStr}`;
};

/**
 * Parse a datetime string from the server (assumes server timezone)
 * and return a Date object for display
 * @param dateTimeStr - DateTime string from server (can be ISO format or date + time)
 * @param timezone - Server timezone the datetime is in
 * @returns Date object
 */
export const parseServerDateTime = (
  dateTimeStr: string,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  if (!dateTimeStr) return new Date();
  
  // If it's already an ISO string with timezone info, parse directly
  if (dateTimeStr.includes('Z') || dateTimeStr.includes('+') || dateTimeStr.includes('-')) {
    return new Date(dateTimeStr);
  }
  
  // Otherwise, parse the datetime and treat it as being in server timezone
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) {
    return new Date();
  }
  
  return date;
};

/**
 * Format a Date for API submission in server timezone
 * Returns both date and time strings for API payload
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns Object with visitDate and visitTime formatted strings
 */
export const formatForApiPayload = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): { visitDate: string; visitTime: string } => {
  return {
    visitDate: toServerDateString(date, timezone),
    visitTime: toServerTimeString(date, timezone),
  };
};

/**
 * Get date parts in server timezone
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns Object with year, month, day, hours, minutes in server timezone
 */
export const getServerDateParts = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): { year: number; month: number; day: number; hours: number; minutes: number } => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };
    
    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
      hours: getPart('hour'),
      minutes: getPart('minute'),
    };
  } catch (error) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  }
};

/**
 * Calculate ISO 8601 duration between two dates in server timezone
 * @param startDate - Start Date object
 * @param endDate - End Date object
 * @param timezone - Server timezone
 * @returns ISO 8601 duration string (e.g., "PT1H30M")
 */
export const calculateServerDuration = (
  startDate: Date,
  endDate: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): string => {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  let isoDuration = "PT";
  if (hours > 0) isoDuration += `${hours}H`;
  if (minutes > 0) isoDuration += `${minutes}M`;
  if (hours === 0 && minutes === 0) isoDuration = "PT0M";
  
  return isoDuration;
};
