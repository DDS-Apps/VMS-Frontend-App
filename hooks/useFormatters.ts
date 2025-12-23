import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useServerTimezone } from '@/hooks/useServerTimezone';
import {
  formatDate as baseFmtDate,
  formatTime as baseFmtTime,
  formatTimeFromString as baseFmtTimeFromString,
  formatTimeRange as baseFmtTimeRange,
  formatDateTime as baseFmtDateTime,
  formatNumber as baseFmtNumber,
  formatCurrency as baseFmtCurrency,
  formatNumberWithDigits,
  toArabicNumerals,
  parseISODuration as baseParseDuration,
  formatDateShortMonth as baseFmtDateShort,
  parseTimeString as baseParseTime,
  LocaleCode,
  DateFormat,
} from '@/utils/formatters';

export function useFormatters() {
  const { localeCode, isRTL } = useLanguage();
  const serverTimezone = useServerTimezone();

  return useMemo(() => ({
    formatDate: (date: Date | string, format: DateFormat = 'medium') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return baseFmtDate(d, localeCode, format, serverTimezone);
    },
    formatDateShort: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return baseFmtDateShort(d, localeCode, serverTimezone);
    },
    formatTime: (date: Date) => baseFmtTime(date, localeCode, serverTimezone),
    formatTimeFromString: (timeString: string) => baseFmtTimeFromString(timeString, localeCode, serverTimezone),
    formatTimeRange: (timeRange: string) => baseFmtTimeRange(timeRange, localeCode, serverTimezone),
    formatDateTime: (date: Date) => baseFmtDateTime(date, localeCode, serverTimezone),
    formatNumber: (num: number) => baseFmtNumber(num, localeCode),
    formatCurrency: (amount: number, currency?: string) => baseFmtCurrency(amount, currency, localeCode),
    formatLocalNumber: (num: number) => formatNumberWithDigits(num, isRTL),
    toLocalNumerals: (str: string) => isRTL ? toArabicNumerals(str) : str,
    parseISODuration: baseParseDuration,
    parseTimeString: baseParseTime,
    localeCode,
    isRTL,
    serverTimezone,
  }), [localeCode, isRTL, serverTimezone]);
}

export default useFormatters;
