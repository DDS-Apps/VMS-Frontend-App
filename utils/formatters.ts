export type LocaleCode = 'ar-SA' | 'en-US';
export type DateFormat = 'short' | 'medium' | 'long';

// Default server timezone
const DEFAULT_TIMEZONE = 'Asia/Riyadh';

export const formatDate = (date: Date, locale: LocaleCode = 'en-US', format: DateFormat = 'medium', timezone?: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: format === 'short' ? 'short' : 'long',
  };
  
  if (format !== 'short') {
    options.year = 'numeric';
  }
  
  if (format === 'long') {
    options.weekday = 'long';
  }
  
  // Add timezone if provided
  if (timezone) {
    options.timeZone = timezone;
  }
  
  try {
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    // Fallback without timezone if invalid
    delete options.timeZone;
    return date.toLocaleDateString(locale, options);
  }
};

export const formatTime = (date: Date, locale: LocaleCode = 'en-US', timezone?: string): string => {
  try {
    // Use Intl.DateTimeFormat with timezone for accurate timezone conversion
    if (timezone) {
      const formatter = new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      
      const parts = formatter.formatToParts(date);
      const hourPart = parts.find(p => p.type === 'hour')?.value || '12';
      const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
      const periodPart = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
      
      if (locale === 'ar-SA') {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        const arabicHours = hourPart.split('').map(d => /\d/.test(d) ? arabicNumerals[parseInt(d)] : d).join('');
        const arabicMinutes = minutePart.split('').map(d => /\d/.test(d) ? arabicNumerals[parseInt(d)] : d).join('');
        const arabicPeriod = periodPart.toLowerCase().includes('am') ? 'ص' : 'م';
        return `${arabicHours}:${arabicMinutes} ${arabicPeriod}`;
      }
      
      return `${hourPart}:${minutePart} ${periodPart.toUpperCase()}`;
    }
  } catch (error) {
    // Fall through to default implementation
  }
  
  // Default implementation without timezone
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  if (hours === 0) hours = 12;
  
  const minuteStr = minutes.toString().padStart(2, '0');
  
  if (locale === 'ar-SA') {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const arabicHours = hours.toString().split('').map(d => arabicNumerals[parseInt(d)]).join('');
    const arabicMinutes = minuteStr.split('').map(d => arabicNumerals[parseInt(d)]).join('');
    const arabicPeriod = period === 'AM' ? 'ص' : 'م';
    return `${arabicHours}:${arabicMinutes} ${arabicPeriod}`;
  }
  
  return `${hours}:${minuteStr} ${period}`;
};

export const formatTimeFromString = (timeString: string, locale: LocaleCode = 'en-US', timezone?: string): string => {
  if (!timeString) return '';
  
  const upperStr = timeString.toUpperCase();
  const hasAMPM = upperStr.includes('AM') || upperStr.includes('PM');
  
  if (timeString.includes(':') && !timeString.includes('T')) {
    if (hasAMPM) {
      const isPM = upperStr.includes('PM');
      const timePart = timeString.replace(/\s*(AM|PM)\s*/i, '');
      const [hoursStr, minutesStr] = timePart.split(':');
      let hour = parseInt(hoursStr, 10);
      const min = parseInt(minutesStr, 10);
      
      if (!isNaN(hour) && !isNaN(min)) {
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
        
        const tempDate = new Date();
        tempDate.setHours(hour, min, 0, 0);
        return formatTime(tempDate, locale, timezone);
      }
    } else {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      
      if (!isNaN(hour) && !isNaN(min)) {
        const tempDate = new Date();
        tempDate.setHours(hour, min, 0, 0);
        return formatTime(tempDate, locale, timezone);
      }
    }
  }
  
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return formatTime(date, locale, timezone);
  }
  
  return timeString;
};

export const formatDateTime = (date: Date, locale: LocaleCode = 'en-US', timezone?: string): string => {
  return `${formatDateShortMonth(date, locale, timezone)} \u2022 ${formatTime(date, locale, timezone)}`;
};

export const formatCurrency = (amount: number, currency: string = 'USD', locale: LocaleCode = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (num: number, locale: LocaleCode = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(num);
};

export const formatNumberWithDigits = (num: number, useArabicNumerals: boolean = false): string => {
  if (useArabicNumerals) {
    return new Intl.NumberFormat('ar-SA', { useGrouping: true }).format(num);
  }
  return new Intl.NumberFormat('en-US').format(num);
};

export const toArabicNumerals = (str: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d, 10)]);
};

export const toWesternNumerals = (str: string): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (d) => String(arabicNumerals.indexOf(d)));
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const parseISODuration = (isoDuration: string): string => {
  if (!isoDuration) return '1 hour';
  
  if (!isoDuration.startsWith('PT')) {
    return isoDuration;
  }
  
  const hourMatch = isoDuration.match(/(\d+)H/);
  const minuteMatch = isoDuration.match(/(\d+)M/);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  
  if (hours === 0 && minutes === 0) return '0 minutes';
  if (hours === 0) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  if (minutes === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  
  const hourPart = hours === 1 ? '1 hour' : `${hours} hours`;
  const minutePart = minutes === 1 ? '1 minute' : `${minutes} minutes`;
  return `${hourPart} ${minutePart}`;
};

export const formatDateShortMonth = (date: Date, locale: LocaleCode = 'en-US', timezone?: string): string => {
  try {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    if (timezone) {
      options.timeZone = timezone;
    }
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    const day = date.getDate();
    const month = date.toLocaleDateString(locale, { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }
};

export const formatTimeRange = (timeRange: string, locale: LocaleCode = 'en-US', timezone?: string): string => {
  if (!timeRange) return '';
  
  // Check if this is an ISO timestamp range (e.g., "2024-01-01T12:00:00.000Z - 2024-01-01T13:00:00.000Z")
  const isoRangeMatch = timeRange.match(/^(.+?T[\d:]+(?:\.\d+)?Z?)\s*[-–]\s*(.+?T[\d:]+(?:\.\d+)?Z?)$/);
  if (isoRangeMatch) {
    const startDate = new Date(isoRangeMatch[1].trim());
    const endDate = new Date(isoRangeMatch[2].trim());
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const startFormatted = formatTime(startDate, locale, timezone);
      const endFormatted = formatTime(endDate, locale, timezone);
      return `${startFormatted} - ${endFormatted}`;
    }
  }
  
  // For simple time ranges like "9:00 AM - 10:00 AM" or "09:00 - 10:00"
  const parts = timeRange.split(/\s*[-–]\s*/);
  if (parts.length !== 2) {
    return formatTimeFromString(timeRange, locale, timezone);
  }
  
  const startTime = formatTimeFromString(parts[0].trim(), locale, timezone);
  const endTime = formatTimeFromString(parts[1].trim(), locale, timezone);
  
  return `${startTime} - ${endTime}`;
};

export const parseTimeString = (timeStr: string, dateStr?: string): Date => {
  const now = new Date();
  
  if (!timeStr || timeStr === 'Invalid Date') {
    return now;
  }
  
  const baseDate = dateStr ? new Date(dateStr) : now;
  if (isNaN(baseDate.getTime())) {
    return now;
  }
  
  const time24Match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    const hours = parseInt(time24Match[1], 10);
    const minutes = parseInt(time24Match[2], 10);
    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  }
  
  const time12Match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (time12Match) {
    let hours = parseInt(time12Match[1], 10);
    const minutes = parseInt(time12Match[2], 10);
    const period = time12Match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  }
  
  return now;
};
