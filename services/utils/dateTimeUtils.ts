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
