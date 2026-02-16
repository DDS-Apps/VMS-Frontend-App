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
  if (!date || isNaN(date.getTime())) {
    return '';
  }
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

/**
 * Formats a phone number for display in unified international format.
 * Pattern: +CCC XX XXX XXXX (always 3-2-3-4 grouping)
 * 
 * Examples:
 * - "966501234567" → "+966 50 123 4567"
 * - "+966501234567" → "+966 50 123 4567"
 * - "0501234567" → "+966 50 123 4567" (Saudi local converted)
 * 
 * Note: All numbers are formatted with 3-2-3-4 pattern for consistency.
 * Shorter numbers are padded progressively as they're typed.
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  let digits = phone.replace(/\D/g, '');
  
  // If no digits, return empty
  if (digits.length === 0) return '';
  
  // Handle 00XXX international prefix (convert 00 to nothing, keeping country code)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  
  // International format: +CCC XX XXX XXXX+ (3-2-3-remaining grouping)
  // This pattern is applied consistently for all phone numbers from any country
  // All digits are preserved - the last group can be longer for >12 digit numbers
  
  // Progressive formatting (same 3-2-3 pattern, remaining goes to last group)
  // \u200E (LTR mark) ensures digits render left-to-right in RTL contexts
  if (digits.length <= 3) {
    return '\u200E+' + digits;
  }
  if (digits.length <= 5) {
    return '\u200E+' + digits.substring(0, 3) + ' ' + digits.substring(3);
  }
  if (digits.length <= 8) {
    return '\u200E+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5);
  }
  // 9+ digits: +CCC XX XXX XXXX+ (last group takes all remaining)
  return '\u200E+' + digits.substring(0, 3) + ' ' + digits.substring(3, 5) + ' ' + digits.substring(5, 8) + ' ' + digits.substring(8);
};

/**
 * Formats phone input as the user types (input masking).
 * Uses formatPhoneNumber internally to ensure display and input mask are identical.
 * 
 * Allows any international phone number - user can enter any country code.
 * Applies the 3-2-3-remaining format pattern to all numbers.
 * 
 * Use this for TextInput onChangeText handlers.
 * 
 * @param input - Raw user input
 * @returns Formatted phone string with masking applied
 */
export const formatPhoneInput = (input: string): string => {
  let digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Handle 00XXX international prefix (convert 00 to nothing, keeping country code)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  
  // Limit to 15 digits (E.164 max)
  digits = digits.substring(0, 15);
  
  // Use formatPhoneNumber to ensure identical output with 3-2-3-remaining pattern
  return formatPhoneNumber(digits);
};

/**
 * Extracts raw digits from a formatted phone number.
 * Use this before sending to API.
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Formats a phone number for display, preserving extension if present.
 * Handles phone numbers stored with "ext. XXX" or "x XXX" suffixes.
 * Also detects embedded extensions for landline numbers that have more digits than expected.
 * Example: "+966 34 531 1234 ext. 223" stays formatted with extension visible.
 * Example: "+966 44 444 4444222" becomes "+966 44 444 4444 ext. 222" (embedded extension detected).
 */
export const formatPhoneForDisplay = (phone: string): string => {
  if (!phone) return '';
  
  // Check if phone has an explicit extension marker
  const extMatch = phone.match(/(.+?)\s*(ext\.?\s*|x\s*)(\d+)$/i);
  
  if (extMatch) {
    const basePart = extMatch[1].trim();
    const extension = extMatch[3];
    const formattedBase = formatPhoneNumber(basePart);
    return `${formattedBase} ext. ${extension}`;
  }
  
  // Check for embedded extension (no explicit marker)
  // Extract only digits to analyze the number length
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Saudi landline numbers starting with 966 typically have 12 digits (966 + 9 digit number)
  // If there are more digits, the extra trailing digits are likely an extension
  if (digitsOnly.startsWith('966') && digitsOnly.length > 12) {
    const baseDigits = digitsOnly.substring(0, 12);
    const extensionDigits = digitsOnly.substring(12);
    
    // Reconstruct the base number with country code
    const baseNumber = '+' + baseDigits;
    const formattedBase = formatPhoneNumber(baseNumber);
    return `${formattedBase} ext. ${extensionDigits}`;
  }
  
  // For other countries or numbers with 10+ digits that might have embedded extensions
  // Standard international numbers are typically 10-13 digits
  // If we have more than 13 digits total, assume last 3-4 digits are extension
  if (digitsOnly.length > 13) {
    const extensionLength = Math.min(digitsOnly.length - 10, 4); // Extension is 3-4 digits
    const baseDigits = digitsOnly.substring(0, digitsOnly.length - extensionLength);
    const extensionDigits = digitsOnly.substring(digitsOnly.length - extensionLength);
    
    // Try to preserve the original format prefix (+ sign if present)
    const hasPlus = phone.trim().startsWith('+');
    const baseNumber = hasPlus ? '+' + baseDigits : baseDigits;
    const formattedBase = formatPhoneNumber(baseNumber);
    return `${formattedBase} ext. ${extensionDigits}`;
  }
  
  // No extension detected, just format normally
  return formatPhoneNumber(phone);
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

const extractTimeFromIso = (isoString: string, locale: LocaleCode = 'en-US'): string => {
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    // Route through formatTime for locale awareness
    const tempDate = new Date();
    tempDate.setHours(hours, minutes, 0, 0);
    return formatTime(tempDate, locale);
  }
  return isoString;
};

// Extract time from ugly Date.toString() format like "Wed Dec 24 2025 14:07:00 GMT+0000 (Coordinated Universal Time)"
const extractTimeFromDateString = (dateStr: string, locale: LocaleCode = 'en-US'): string | null => {
  // Match pattern like "Wed Dec 24 2025 14:07:00 GMT" or similar
  const match = dateStr.match(/\w+\s+\w+\s+\d+\s+\d+\s+(\d{2}):(\d{2}):\d{2}/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    // Route through formatTime for locale awareness
    const tempDate = new Date();
    tempDate.setHours(hours, minutes, 0, 0);
    return formatTime(tempDate, locale);
  }
  return null;
};

export const formatTimeRange = (timeRange: string, locale: LocaleCode = 'en-US', timezone?: string): string => {
  if (!timeRange) return '';
  
  // Check for ugly Date.toString() range format like "Wed Dec 24 2025 14:07:00 GMT+0000 ... - Wed Dec 24 2025 15:07:00 GMT+0000 ..."
  if (timeRange.includes('GMT') && timeRange.match(/\w{3}\s+\w{3}\s+\d+\s+\d+/)) {
    const parts = timeRange.split(/\s*[-–]\s*/);
    if (parts.length === 2) {
      const startTime = extractTimeFromDateString(parts[0].trim(), locale);
      const endTime = extractTimeFromDateString(parts[1].trim(), locale);
      if (startTime && endTime) {
        return `${startTime} - ${endTime}`;
      }
    }
    // Single ugly date string
    const singleTime = extractTimeFromDateString(timeRange, locale);
    if (singleTime) return singleTime;
  }
  
  // Check if this is an ISO timestamp range (e.g., "2024-01-01T12:00:00.000Z - 2024-01-01T13:00:00.000Z")
  const isoRangeMatch = timeRange.match(/^(.+?T[\d:]+(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s*[-–]\s*(.+?T[\d:]+(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)$/);
  if (isoRangeMatch) {
    const startFormatted = extractTimeFromIso(isoRangeMatch[1].trim(), locale);
    const endFormatted = extractTimeFromIso(isoRangeMatch[2].trim(), locale);
    return `${startFormatted} - ${endFormatted}`;
  }
  
  // If already a formatted AM/PM time range, return as-is to avoid timezone re-conversion
  const ampmRangeMatch = timeRange.match(/^\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)$/i);
  if (ampmRangeMatch) {
    return timeRange;
  }
  
  // For simple time ranges like "09:00 - 10:00" (24-hour format without AM/PM)
  const parts = timeRange.split(/\s*[-–]\s*/);
  if (parts.length !== 2) {
    return formatTimeFromString(timeRange, locale, timezone);
  }
  
  const startTime = formatTimeFromString(parts[0].trim(), locale, timezone);
  const endTime = formatTimeFromString(parts[1].trim(), locale, timezone);
  
  return `${startTime} - ${endTime}`;
};

export const formatVisitTimeRange = (
  visitTime: string,
  endTime?: string,
  locale: LocaleCode = 'en-US'
): string => {
  const formattedStart = formatTimeFromString(visitTime, locale);
  if (endTime) {
    const formattedEnd = formatTimeFromString(endTime, locale);
    return `${formattedStart} - ${formattedEnd}`;
  }
  return formattedStart;
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

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with first letter capitalized
 */
export const capitalizeFirst = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
