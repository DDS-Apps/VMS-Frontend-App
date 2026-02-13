import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  formatDate as baseFmtDate,
  formatTime as baseFmtTime,
  formatTimeFromString as baseFmtTimeFromString,
  formatTimeRange as baseFmtTimeRange,
  formatVisitTimeRange as baseFmtVisitTimeRange,
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

  return useMemo(() => ({
    formatDate: (date: Date | string, format: DateFormat = 'medium') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return baseFmtDate(d, localeCode, format);
    },
    formatDateShort: (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return baseFmtDateShort(d, localeCode);
    },
    formatTime: (date: Date) => baseFmtTime(date, localeCode),
    formatTimeFromString: (timeString: string) => baseFmtTimeFromString(timeString, localeCode),
    formatTimeRange: (timeRange: string) => baseFmtTimeRange(timeRange, localeCode),
    formatVisitTimeRange: (visitTime: string, endTime?: string) => baseFmtVisitTimeRange(visitTime, endTime, localeCode),
    formatDateTime: (date: Date | string, timezone?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return baseFmtDateTime(d, localeCode, timezone);
    },
    formatNumber: (num: number) => baseFmtNumber(num, localeCode),
    formatCurrency: (amount: number, currency?: string) => baseFmtCurrency(amount, currency, localeCode),
    formatLocalNumber: (num: number) => formatNumberWithDigits(num, isRTL),
    toLocalNumerals: (str: string) => isRTL ? toArabicNumerals(str) : str,
    parseISODuration: (isoDuration: string) => {
      const parsed = baseParseDuration(isoDuration);
      if (!isRTL) return parsed;
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const toAr = (s: string) => s.replace(/[0-9]/g, d => arabicNumerals[parseInt(d, 10)]);
      return toAr(parsed)
        .replace(/hours?/gi, (m) => m.toLowerCase().startsWith('hours') ? 'ساعات' : 'ساعة')
        .replace(/minutes?/gi, (m) => m.toLowerCase().startsWith('minutes') ? 'دقائق' : 'دقيقة');
    },
    parseTimeString: baseParseTime,
    localeCode,
    isRTL,
  }), [localeCode, isRTL]);
}

export default useFormatters;
