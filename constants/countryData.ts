export interface CountryData {
  code: string;
  name: string;
  nameAr: string;
  dialCode: string;
  flag: string;
  format: string;
  maxLength: number;
}

export const COUNTRIES: CountryData[] = [
  // Gulf Countries (Priority)
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', dialCode: '+966', flag: '🇸🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dialCode: '+971', flag: '🇦🇪', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', dialCode: '+968', flag: '🇴🇲', format: 'XXXX XXXX', maxLength: 8 },
  
  // Middle East
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸', format: 'XXX XXX XXX', maxLength: 9 },
  
  // Common International
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'IN', name: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX', maxLength: 10 },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', flag: '🇵🇰', format: 'XXX XXXXXXX', maxLength: 10 },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', dialCode: '+63', flag: '🇵🇭', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '+880', flag: '🇧🇩', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '+62', flag: '🇮🇩', format: 'XXX XXXX XXXX', maxLength: 11 },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪', format: 'XXX XXXXXXXX', maxLength: 11 },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷', format: 'X XX XX XX XX', maxLength: 9 },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CN', name: 'China', nameAr: 'الصين', dialCode: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX', maxLength: 11 },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', dialCode: '+81', flag: '🇯🇵', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', dialCode: '+82', flag: '🇰🇷', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dialCode: '+61', flag: '🇦🇺', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', dialCode: '+55', flag: '🇧🇷', format: 'XX XXXXX XXXX', maxLength: 11 },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', dialCode: '+7', flag: '🇷🇺', format: 'XXX XXX XX XX', maxLength: 10 },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', dialCode: '+27', flag: '🇿🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', dialCode: '+234', flag: '🇳🇬', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', dialCode: '+60', flag: '🇲🇾', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', dialCode: '+65', flag: '🇸🇬', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', dialCode: '+66', flag: '🇹🇭', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', dialCode: '+84', flag: '🇻🇳', format: 'XXX XXX XXXX', maxLength: 10 },
];

export const DEFAULT_COUNTRY_CODE = 'SA';

export const getCountryByCode = (code: string): CountryData | undefined => {
  return COUNTRIES.find(c => c.code === code);
};

export const getCountryByDialCode = (dialCode: string): CountryData | undefined => {
  return COUNTRIES.find(c => c.dialCode === dialCode);
};

export const parsePhoneWithCountry = (fullPhone: string): { country: CountryData; nationalNumber: string } | null => {
  if (!fullPhone || !fullPhone.startsWith('+')) {
    return null;
  }
  
  // Try to match dial codes from longest to shortest
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  
  for (const country of sortedCountries) {
    if (fullPhone.startsWith(country.dialCode)) {
      const nationalNumber = fullPhone.slice(country.dialCode.length).replace(/\s/g, '');
      return { country, nationalNumber };
    }
  }
  
  return null;
};

export const formatNationalNumber = (number: string, format: string): string => {
  const digits = number.replace(/\D/g, '');
  let result = '';
  let digitIndex = 0;
  
  for (const char of format) {
    if (digitIndex >= digits.length) break;
    
    if (char === 'X') {
      result += digits[digitIndex];
      digitIndex++;
    } else {
      result += char;
    }
  }
  
  // Add remaining digits if format is shorter
  if (digitIndex < digits.length) {
    result += digits.slice(digitIndex);
  }
  
  return result;
};
