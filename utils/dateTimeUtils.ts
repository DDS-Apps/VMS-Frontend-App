export interface DateTimeFormatOptions {
  isRTL?: boolean;
  includeYear?: boolean;
  includeWeekday?: boolean;
  includeTime?: boolean;
  timezone?: string;
}

export const formatDate = (
  dateInput: string | Date,
  options: DateTimeFormatOptions = {}
): string => {
  const { isRTL = false, includeYear = false, includeWeekday = false, timezone } = options;
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

  if (timezone) {
    formatOptions.timeZone = timezone;
  }

  try {
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', formatOptions);
  } catch (error) {
    delete formatOptions.timeZone;
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', formatOptions);
  }
};

export const formatFullDate = (
  dateInput: string | Date,
  isRTL: boolean = false,
  timezone?: string
): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  try {
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', options);
  } catch (error) {
    delete options.timeZone;
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', options);
  }
};

export const formatTime = (
  timeInput: string | Date,
  isRTL: boolean = false,
  timezone?: string
): string => {
  if (typeof timeInput === 'string') {
    if (timeInput.includes('AM') || timeInput.includes('PM')) {
      if (isRTL) {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return timeInput
          .replace(/AM/g, 'ص')
          .replace(/PM/g, 'م')
          .replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
      }
      return timeInput;
    }
    if (timeInput.includes(':') && !timeInput.includes('T')) {
      const [hours, minutes] = timeInput.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const formatted = `${displayHour}:${minutes} ${period}`;
      if (isRTL) {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return formatted
          .replace(/AM/g, 'ص')
          .replace(/PM/g, 'م')
          .replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
      }
      return formatted;
    }
    const date = new Date(timeInput);
    if (!isNaN(date.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      if (timezone) {
        options.timeZone = timezone;
      }
      try {
        return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', options);
      } catch (error) {
        delete options.timeZone;
        return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', options);
      }
    }
    return timeInput;
  }
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  if (timezone) {
    options.timeZone = timezone;
  }
  try {
    return timeInput.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', options);
  } catch (error) {
    delete options.timeZone;
    return timeInput.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', options);
  }
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
  isRTL: boolean = false,
  timezone?: string
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

  const dateStr = formatDate(date, { isRTL, timezone });
  const timeStr = formatTime(date, isRTL, timezone);

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
 * Convert a local Date to a 24-hour time string in server timezone (HH:mm format)
 * Used for room availability queries which expect 24-hour format
 * @param date - Local Date object
 * @param timezone - Server timezone
 * @returns Time string in HH:mm format for the server timezone
 */
export const toServerTime24String = (
  date: Date,
  timezone: string = DEFAULT_SERVER_TIMEZONE
): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(date);
  } catch (error) {
    // Fallback to local formatting
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

/**
 * Calculate human-readable duration between two dates
 * @param startDate - Start Date object
 * @param endDate - End Date object
 * @param timezone - Server timezone (unused, kept for API compatibility)
 * @returns Human-readable duration string (e.g., "2 hours 10 minutes")
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
  
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (parts.length === 0) {
    return '0 minutes';
  }
  
  return parts.join(' ');
};

// ===== PICKER TIMEZONE CONVERSION =====
// These functions handle the conversion between DateTimePicker values (device local)
// and server timezone values. The goal is to make the user's selection be interpreted
// as the server timezone, not their device timezone.

/**
 * Get the offset in milliseconds between device timezone and server timezone
 * @param date - Reference date (for DST calculations)
 * @param serverTimezone - Server timezone string
 * @returns Offset in milliseconds (positive means server is ahead of device)
 */
export const getTimezoneOffset = (
  date: Date,
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): number => {
  try {
    const deviceOffset = date.getTimezoneOffset() * 60 * 1000;
    
    const serverFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: serverTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = serverFormatter.formatToParts(date);
    const getPart = (type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };
    
    const serverDate = new Date(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour'),
      getPart('minute'),
      getPart('second')
    );
    
    const serverOffset = -(serverDate.getTime() - date.getTime() - deviceOffset);
    
    return serverOffset;
  } catch (error) {
    return 0;
  }
};

/**
 * Convert a picker Date (device local time) to server timezone Date
 * 
 * When user picks "3:00 PM" on their device, this creates a Date that when
 * formatted in server timezone will show "3:00 PM".
 * 
 * The key insight: we want to find a UTC timestamp T such that when T is
 * formatted in serverTimezone, it shows the same wall-clock time as what
 * the picker shows in device local time.
 * 
 * @param pickerDate - Date from DateTimePicker (device local time)
 * @param serverTimezone - Server timezone string
 * @returns Date that represents the same wall-clock time in server timezone
 */
export const convertPickerToServerDate = (
  pickerDate: Date,
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  try {
    const year = pickerDate.getFullYear();
    const month = pickerDate.getMonth() + 1;
    const day = pickerDate.getDate();
    const hours = pickerDate.getHours();
    const minutes = pickerDate.getMinutes();
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    
    const tempDate = new Date(dateStr);
    if (isNaN(tempDate.getTime())) {
      return pickerDate;
    }
    
    const deviceOffsetMs = tempDate.getTimezoneOffset() * 60 * 1000;
    
    const utcDate = new Date(tempDate.getTime() + deviceOffsetMs);
    
    const serverFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: serverTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = serverFormatter.formatToParts(utcDate);
    const getPart = (type: string) => {
      const part = parts.find(p => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };
    
    const serverHour = getPart('hour');
    const serverMinute = getPart('minute');
    const serverDay = getPart('day');
    
    const hourDiff = hours - serverHour;
    const minuteDiff = minutes - serverMinute;
    let dayDiff = day - serverDay;
    
    if (dayDiff > 15) dayDiff = dayDiff - 31;
    else if (dayDiff < -15) dayDiff = dayDiff + 31;
    
    const adjustMs = ((dayDiff * 24 + hourDiff) * 60 + minuteDiff) * 60 * 1000;
    
    return new Date(utcDate.getTime() + adjustMs);
  } catch (error) {
    return pickerDate;
  }
};

/**
 * Convert a server timezone Date to a picker Date (device local time)
 * 
 * When we have a Date representing "3:00 PM" in server timezone, this creates
 * a Date that will show "3:00 PM" on the device's DateTimePicker.
 * 
 * @param serverDate - Date representing time in server timezone
 * @param serverTimezone - Server timezone string
 * @returns Date suitable for DateTimePicker that shows same wall-clock time
 */
export const convertServerDateToPicker = (
  serverDate: Date,
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  try {
    const parts = getServerDateParts(serverDate, serverTimezone);
    
    return new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hours,
      parts.minutes,
      0
    );
  } catch (error) {
    return serverDate;
  }
};

/**
 * Create a Date for a specific time in server timezone
 * 
 * @param year - Year
 * @param month - Month (1-12)
 * @param day - Day of month
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @param serverTimezone - Server timezone string
 * @returns Date representing that time in server timezone
 */
export const createServerDate = (
  year: number,
  month: number,
  day: number,
  hours: number = 0,
  minutes: number = 0,
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  const pickerDate = new Date(year, month - 1, day, hours, minutes, 0);
  return convertPickerToServerDate(pickerDate, serverTimezone);
};

/**
 * Parse a date string (YYYY-MM-DD) and time string (h:mm AM/PM or HH:mm)
 * as server timezone and return appropriate Date
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in h:mm AM/PM or HH:mm format
 * @param serverTimezone - Server timezone string
 * @returns Date representing that datetime in server timezone
 */
export const parseServerDateTimeStrings = (
  dateStr: string,
  timeStr: string,
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  
  let hours = 0;
  let minutes = 0;
  
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const isPM = timeStr.includes('PM');
    const timePart = timeStr.replace(/\s*(AM|PM)/i, '');
    const [h, m] = timePart.split(':').map(Number);
    hours = h;
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    minutes = m || 0;
  } else if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    hours = h;
    minutes = m || 0;
  }
  
  return createServerDate(year, month, day, hours, minutes, serverTimezone);
};

/**
 * Get the current date/time in server timezone as a Date object
 * that can be used with DateTimePicker
 * 
 * @param serverTimezone - Server timezone string
 * @returns Date showing current time in server timezone
 */
export const getServerNowForPicker = (
  serverTimezone: string = DEFAULT_SERVER_TIMEZONE
): Date => {
  return convertServerDateToPicker(new Date(), serverTimezone);
};

/**
 * Check if a visit has expired (end time has passed)
 * A visit is only expired when the END time has passed, not the start time
 * 
 * @param visitDate - Date string in YYYY-MM-DD format
 * @param visitTime - Start time string (optional)
 * @param endTime - End time string (optional)
 * @param duration - Duration string (optional, e.g., "2 hours", "PT2H")
 * @returns true if the visit has expired
 */
export const isVisitExpired = (
  visitDate: string | undefined,
  visitTime?: string,
  endTime?: string,
  duration?: string
): boolean => {
  if (!visitDate) return false;
  
  try {
    const now = new Date();
    
    // Helper to parse time string to hours/minutes
    const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
      if (!timeStr) return null;
      
      // Handle 12-hour format (e.g., "9:00 AM", "2:30 PM")
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const isPM = timeStr.toUpperCase().includes('PM');
        const timePart = timeStr.replace(/\s*(AM|PM)/i, '').trim();
        const [h, m] = timePart.split(':').map(Number);
        let hours = h;
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        return { hours, minutes: m || 0 };
      }
      
      // Handle 24-hour format (e.g., "14:30")
      if (timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        return { hours: h, minutes: m || 0 };
      }
      
      return null;
    };
    
    // Helper to parse duration to milliseconds
    const parseDurationMs = (dur: string): number => {
      if (!dur) return 60 * 60 * 1000; // Default 1 hour
      
      const durStr = String(dur).trim();
      
      // Handle "Full Day"
      if (/full\s*day/i.test(durStr)) {
        return 24 * 60 * 60 * 1000;
      }
      
      // Parse ISO 8601 duration (e.g., "PT1H30M", "PT24H", "P1D")
      if (durStr.startsWith("P")) {
        let totalMs = 0;
        const daysMatch = durStr.match(/(\d+)D/i);
        const hoursMatch = durStr.match(/(\d+)H/i);
        const minutesMatch = durStr.match(/(\d+)M(?!O)/i);
        if (daysMatch) totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
        if (hoursMatch) totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
        if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
        return totalMs > 0 ? totalMs : 60 * 60 * 1000;
      }
      
      // Parse human-readable format (e.g., "2 hours 10 minutes")
      let totalMs = 0;
      const daysMatch = durStr.match(/(\d+(?:\.\d+)?)\s*days?/i);
      const hoursMatch = durStr.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h\b)/i);
      const minutesMatch = durStr.match(/(\d+)\s*(?:minutes?|mins?|m\b)/i);
      
      if (daysMatch) totalMs += parseFloat(daysMatch[1]) * 24 * 60 * 60 * 1000;
      if (hoursMatch) totalMs += parseFloat(hoursMatch[1]) * 60 * 60 * 1000;
      if (minutesMatch) totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
      
      return totalMs > 0 ? totalMs : 60 * 60 * 1000;
    };
    
    const [year, month, day] = visitDate.split('-').map(Number);
    if (!year || !month || !day) return false;
    
    // Priority 1: Check end time if available
    if (endTime) {
      const endTimeParsed = parseTime(endTime);
      if (endTimeParsed) {
        const visitEndDateTime = new Date(year, month - 1, day, endTimeParsed.hours, endTimeParsed.minutes);
        if (!isNaN(visitEndDateTime.getTime())) {
          return visitEndDateTime < now;
        }
      }
    }
    
    // Priority 2: Calculate end time from start time + duration
    if (visitTime && duration) {
      const startTimeParsed = parseTime(visitTime);
      if (startTimeParsed) {
        const startDateTime = new Date(year, month - 1, day, startTimeParsed.hours, startTimeParsed.minutes);
        if (!isNaN(startDateTime.getTime())) {
          const durationMs = parseDurationMs(duration);
          const calculatedEndTime = new Date(startDateTime.getTime() + durationMs);
          return calculatedEndTime < now;
        }
      }
    }
    
    // Fallback: check if the visit date (end of day) has passed
    const visitDateEndOfDay = new Date(year, month - 1, day, 23, 59, 59);
    return visitDateEndOfDay < now;
    
  } catch (err) {
    return false;
  }
};
