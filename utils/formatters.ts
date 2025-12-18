export type LocaleCode = 'ar-SA' | 'en-US';
export type DateFormat = 'short' | 'medium' | 'long';

export const formatDate = (date: Date, locale: LocaleCode = 'en-US', format: DateFormat = 'medium'): string => {
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
  
  return date.toLocaleDateString(locale, options);
};

export const formatTime = (date: Date, locale: LocaleCode = 'en-US'): string => {
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

export const formatTimeFromString = (timeString: string, locale: LocaleCode = 'en-US'): string => {
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
        return formatTime(tempDate, locale);
      }
    } else {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      
      if (!isNaN(hour) && !isNaN(min)) {
        const tempDate = new Date();
        tempDate.setHours(hour, min, 0, 0);
        return formatTime(tempDate, locale);
      }
    }
  }
  
  const date = new Date(timeString);
  if (!isNaN(date.getTime())) {
    return formatTime(date, locale);
  }
  
  return timeString;
};

export const formatDateTime = (date: Date, locale: LocaleCode = 'en-US'): string => {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
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

export const formatDateShortMonth = (date: Date, locale: LocaleCode = 'en-US'): string => {
  const day = date.getDate();
  const month = date.toLocaleDateString(locale, { month: 'short' });
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

export const formatTimeRange = (timeRange: string, locale: LocaleCode = 'en-US'): string => {
  if (!timeRange) return '';
  
  const parts = timeRange.split(/\s*[-–]\s*/);
  if (parts.length !== 2) {
    return formatTimeFromString(timeRange, locale);
  }
  
  const startTime = formatTimeFromString(parts[0].trim(), locale);
  const endTime = formatTimeFromString(parts[1].trim(), locale);
  
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
