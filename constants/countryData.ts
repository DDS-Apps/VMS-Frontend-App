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
  
  // Middle East & North Africa
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'IL', name: 'Israel', nameAr: 'إسرائيل', dialCode: '+972', flag: '🇮🇱', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'IR', name: 'Iran', nameAr: 'إيران', dialCode: '+98', flag: '🇮🇷', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', dialCode: '+216', flag: '🇹🇳', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿', format: 'XXX XX XX XX', maxLength: 9 },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦', format: 'XXX XXXXXX', maxLength: 9 },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', flag: '🇲🇷', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال', dialCode: '+252', flag: '🇸🇴', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', dialCode: '+253', flag: '🇩🇯', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر', dialCode: '+269', flag: '🇰🇲', format: 'XXX XXXX', maxLength: 7 },

  // Europe
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪', format: 'XXX XXXXXXXX', maxLength: 11 },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷', format: 'X XX XX XX XX', maxLength: 9 },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', dialCode: '+351', flag: '🇵🇹', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', dialCode: '+31', flag: '🇳🇱', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', dialCode: '+32', flag: '🇧🇪', format: 'XXX XX XX XX', maxLength: 9 },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', dialCode: '+41', flag: '🇨🇭', format: 'XX XXX XX XX', maxLength: 9 },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', dialCode: '+43', flag: '🇦🇹', format: 'XXX XXXXXXX', maxLength: 10 },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', dialCode: '+46', flag: '🇸🇪', format: 'XX XXX XX XX', maxLength: 9 },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', dialCode: '+47', flag: '🇳🇴', format: 'XXX XX XXX', maxLength: 8 },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', dialCode: '+45', flag: '🇩🇰', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', dialCode: '+358', flag: '🇫🇮', format: 'XX XXX XXXX', maxLength: 10 },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', dialCode: '+48', flag: '🇵🇱', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', dialCode: '+420', flag: '🇨🇿', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', dialCode: '+30', flag: '🇬🇷', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر', dialCode: '+36', flag: '🇭🇺', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا', dialCode: '+40', flag: '🇷🇴', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'BG', name: 'Bulgaria', nameAr: 'بلغاريا', dialCode: '+359', flag: '🇧🇬', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'HR', name: 'Croatia', nameAr: 'كرواتيا', dialCode: '+385', flag: '🇭🇷', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'SK', name: 'Slovakia', nameAr: 'سلوفاكيا', dialCode: '+421', flag: '🇸🇰', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'SI', name: 'Slovenia', nameAr: 'سلوفينيا', dialCode: '+386', flag: '🇸🇮', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'RS', name: 'Serbia', nameAr: 'صربيا', dialCode: '+381', flag: '🇷🇸', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'BA', name: 'Bosnia and Herzegovina', nameAr: 'البوسنة والهرسك', dialCode: '+387', flag: '🇧🇦', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'AL', name: 'Albania', nameAr: 'ألبانيا', dialCode: '+355', flag: '🇦🇱', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'MK', name: 'North Macedonia', nameAr: 'مقدونيا الشمالية', dialCode: '+389', flag: '🇲🇰', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'ME', name: 'Montenegro', nameAr: 'الجبل الأسود', dialCode: '+382', flag: '🇲🇪', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'XK', name: 'Kosovo', nameAr: 'كوسوفو', dialCode: '+383', flag: '🇽🇰', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', dialCode: '+353', flag: '🇮🇪', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'IS', name: 'Iceland', nameAr: 'آيسلندا', dialCode: '+354', flag: '🇮🇸', format: 'XXX XXXX', maxLength: 7 },
  { code: 'LU', name: 'Luxembourg', nameAr: 'لوكسمبورغ', dialCode: '+352', flag: '🇱🇺', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'MT', name: 'Malta', nameAr: 'مالطا', dialCode: '+356', flag: '🇲🇹', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'CY', name: 'Cyprus', nameAr: 'قبرص', dialCode: '+357', flag: '🇨🇾', format: 'XX XXXXXX', maxLength: 8 },
  { code: 'EE', name: 'Estonia', nameAr: 'إستونيا', dialCode: '+372', flag: '🇪🇪', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'LV', name: 'Latvia', nameAr: 'لاتفيا', dialCode: '+371', flag: '🇱🇻', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'LT', name: 'Lithuania', nameAr: 'ليتوانيا', dialCode: '+370', flag: '🇱🇹', format: 'XXX XXXXX', maxLength: 8 },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', dialCode: '+380', flag: '🇺🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'BY', name: 'Belarus', nameAr: 'بيلاروسيا', dialCode: '+375', flag: '🇧🇾', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'MD', name: 'Moldova', nameAr: 'مولدوفا', dialCode: '+373', flag: '🇲🇩', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', dialCode: '+7', flag: '🇷🇺', format: 'XXX XXX XX XX', maxLength: 10 },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'GE', name: 'Georgia', nameAr: 'جورجيا', dialCode: '+995', flag: '🇬🇪', format: 'XXX XX XX XX', maxLength: 9 },
  { code: 'AM', name: 'Armenia', nameAr: 'أرمينيا', dialCode: '+374', flag: '🇦🇲', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'AZ', name: 'Azerbaijan', nameAr: 'أذربيجان', dialCode: '+994', flag: '🇦🇿', format: 'XX XXX XXXX', maxLength: 9 },

  // North America
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', dialCode: '+52', flag: '🇲🇽', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'GT', name: 'Guatemala', nameAr: 'غواتيمالا', dialCode: '+502', flag: '🇬🇹', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'HN', name: 'Honduras', nameAr: 'هندوراس', dialCode: '+504', flag: '🇭🇳', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'SV', name: 'El Salvador', nameAr: 'السلفادور', dialCode: '+503', flag: '🇸🇻', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'NI', name: 'Nicaragua', nameAr: 'نيكاراغوا', dialCode: '+505', flag: '🇳🇮', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'CR', name: 'Costa Rica', nameAr: 'كوستاريكا', dialCode: '+506', flag: '🇨🇷', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'PA', name: 'Panama', nameAr: 'بنما', dialCode: '+507', flag: '🇵🇦', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'CU', name: 'Cuba', nameAr: 'كوبا', dialCode: '+53', flag: '🇨🇺', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'DO', name: 'Dominican Republic', nameAr: 'جمهورية الدومينيكان', dialCode: '+1809', flag: '🇩🇴', format: 'XXX XXXX', maxLength: 7 },
  { code: 'JM', name: 'Jamaica', nameAr: 'جامايكا', dialCode: '+1876', flag: '🇯🇲', format: 'XXX XXXX', maxLength: 7 },
  { code: 'HT', name: 'Haiti', nameAr: 'هايتي', dialCode: '+509', flag: '🇭🇹', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'TT', name: 'Trinidad and Tobago', nameAr: 'ترينيداد وتوباغو', dialCode: '+1868', flag: '🇹🇹', format: 'XXX XXXX', maxLength: 7 },
  { code: 'BS', name: 'Bahamas', nameAr: 'الباهاماس', dialCode: '+1242', flag: '🇧🇸', format: 'XXX XXXX', maxLength: 7 },
  { code: 'BB', name: 'Barbados', nameAr: 'باربادوس', dialCode: '+1246', flag: '🇧🇧', format: 'XXX XXXX', maxLength: 7 },
  { code: 'BZ', name: 'Belize', nameAr: 'بليز', dialCode: '+501', flag: '🇧🇿', format: 'XXX XXXX', maxLength: 7 },

  // South America
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', dialCode: '+55', flag: '🇧🇷', format: 'XX XXXXX XXXX', maxLength: 11 },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', dialCode: '+54', flag: '🇦🇷', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', dialCode: '+57', flag: '🇨🇴', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي', dialCode: '+56', flag: '🇨🇱', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو', dialCode: '+51', flag: '🇵🇪', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'VE', name: 'Venezuela', nameAr: 'فنزويلا', dialCode: '+58', flag: '🇻🇪', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'EC', name: 'Ecuador', nameAr: 'الإكوادور', dialCode: '+593', flag: '🇪🇨', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'BO', name: 'Bolivia', nameAr: 'بوليفيا', dialCode: '+591', flag: '🇧🇴', format: 'X XXX XXXX', maxLength: 8 },
  { code: 'PY', name: 'Paraguay', nameAr: 'باراغواي', dialCode: '+595', flag: '🇵🇾', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'UY', name: 'Uruguay', nameAr: 'أوروغواي', dialCode: '+598', flag: '🇺🇾', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'GY', name: 'Guyana', nameAr: 'غيانا', dialCode: '+592', flag: '🇬🇾', format: 'XXX XXXX', maxLength: 7 },
  { code: 'SR', name: 'Suriname', nameAr: 'سورينام', dialCode: '+597', flag: '🇸🇷', format: 'XXX XXXX', maxLength: 7 },

  // Asia
  { code: 'CN', name: 'China', nameAr: 'الصين', dialCode: '+86', flag: '🇨🇳', format: 'XXX XXXX XXXX', maxLength: 11 },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', dialCode: '+81', flag: '🇯🇵', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', dialCode: '+82', flag: '🇰🇷', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'KP', name: 'North Korea', nameAr: 'كوريا الشمالية', dialCode: '+850', flag: '🇰🇵', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'IN', name: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳', format: 'XXXXX XXXXX', maxLength: 10 },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', flag: '🇵🇰', format: 'XXX XXXXXXX', maxLength: 10 },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '+880', flag: '🇧🇩', format: 'XXXX XXXXXX', maxLength: 10 },
  { code: 'LK', name: 'Sri Lanka', nameAr: 'سريلانكا', dialCode: '+94', flag: '🇱🇰', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'NP', name: 'Nepal', nameAr: 'نيبال', dialCode: '+977', flag: '🇳🇵', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'BT', name: 'Bhutan', nameAr: 'بوتان', dialCode: '+975', flag: '🇧🇹', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'MV', name: 'Maldives', nameAr: 'المالديف', dialCode: '+960', flag: '🇲🇻', format: 'XXX XXXX', maxLength: 7 },
  { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان', dialCode: '+93', flag: '🇦🇫', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '+62', flag: '🇮🇩', format: 'XXX XXXX XXXX', maxLength: 11 },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', dialCode: '+60', flag: '🇲🇾', format: 'XX XXXX XXXX', maxLength: 10 },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', dialCode: '+65', flag: '🇸🇬', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', dialCode: '+66', flag: '🇹🇭', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', dialCode: '+84', flag: '🇻🇳', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', dialCode: '+63', flag: '🇵🇭', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'MM', name: 'Myanmar', nameAr: 'ميانمار', dialCode: '+95', flag: '🇲🇲', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'KH', name: 'Cambodia', nameAr: 'كمبوديا', dialCode: '+855', flag: '🇰🇭', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'LA', name: 'Laos', nameAr: 'لاوس', dialCode: '+856', flag: '🇱🇦', format: 'XX XX XXX XXX', maxLength: 10 },
  { code: 'BN', name: 'Brunei', nameAr: 'بروناي', dialCode: '+673', flag: '🇧🇳', format: 'XXX XXXX', maxLength: 7 },
  { code: 'TL', name: 'Timor-Leste', nameAr: 'تيمور الشرقية', dialCode: '+670', flag: '🇹🇱', format: 'XXX XXXX', maxLength: 7 },
  { code: 'MN', name: 'Mongolia', nameAr: 'منغوليا', dialCode: '+976', flag: '🇲🇳', format: 'XX XX XXXX', maxLength: 8 },
  { code: 'KZ', name: 'Kazakhstan', nameAr: 'كازاخستان', dialCode: '+7', flag: '🇰🇿', format: 'XXX XXX XX XX', maxLength: 10 },
  { code: 'UZ', name: 'Uzbekistan', nameAr: 'أوزبكستان', dialCode: '+998', flag: '🇺🇿', format: 'XX XXX XX XX', maxLength: 9 },
  { code: 'TM', name: 'Turkmenistan', nameAr: 'تركمانستان', dialCode: '+993', flag: '🇹🇲', format: 'XX XXXXXX', maxLength: 8 },
  { code: 'TJ', name: 'Tajikistan', nameAr: 'طاجيكستان', dialCode: '+992', flag: '🇹🇯', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'KG', name: 'Kyrgyzstan', nameAr: 'قيرغيزستان', dialCode: '+996', flag: '🇰🇬', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'HK', name: 'Hong Kong', nameAr: 'هونغ كونغ', dialCode: '+852', flag: '🇭🇰', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'MO', name: 'Macau', nameAr: 'ماكاو', dialCode: '+853', flag: '🇲🇴', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'TW', name: 'Taiwan', nameAr: 'تايوان', dialCode: '+886', flag: '🇹🇼', format: 'XXX XXX XXX', maxLength: 9 },

  // Africa
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', dialCode: '+27', flag: '🇿🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', dialCode: '+234', flag: '🇳🇬', format: 'XXX XXX XXXX', maxLength: 10 },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا', dialCode: '+254', flag: '🇰🇪', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', dialCode: '+251', flag: '🇪🇹', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'GH', name: 'Ghana', nameAr: 'غانا', dialCode: '+233', flag: '🇬🇭', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا', dialCode: '+255', flag: '🇹🇿', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'UG', name: 'Uganda', nameAr: 'أوغندا', dialCode: '+256', flag: '🇺🇬', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'RW', name: 'Rwanda', nameAr: 'رواندا', dialCode: '+250', flag: '🇷🇼', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CD', name: 'DR Congo', nameAr: 'الكونغو الديمقراطية', dialCode: '+243', flag: '🇨🇩', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'CG', name: 'Congo', nameAr: 'الكونغو', dialCode: '+242', flag: '🇨🇬', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'AO', name: 'Angola', nameAr: 'أنغولا', dialCode: '+244', flag: '🇦🇴', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'MZ', name: 'Mozambique', nameAr: 'موزمبيق', dialCode: '+258', flag: '🇲🇿', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'ZW', name: 'Zimbabwe', nameAr: 'زيمبابوي', dialCode: '+263', flag: '🇿🇼', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'ZM', name: 'Zambia', nameAr: 'زامبيا', dialCode: '+260', flag: '🇿🇲', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'BW', name: 'Botswana', nameAr: 'بوتسوانا', dialCode: '+267', flag: '🇧🇼', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'NA', name: 'Namibia', nameAr: 'ناميبيا', dialCode: '+264', flag: '🇳🇦', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'SN', name: 'Senegal', nameAr: 'السنغال', dialCode: '+221', flag: '🇸🇳', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'CI', name: 'Ivory Coast', nameAr: 'ساحل العاج', dialCode: '+225', flag: '🇨🇮', format: 'XX XX XX XXXX', maxLength: 10 },
  { code: 'CM', name: 'Cameroon', nameAr: 'الكاميرون', dialCode: '+237', flag: '🇨🇲', format: 'X XX XX XX XX', maxLength: 9 },
  { code: 'ML', name: 'Mali', nameAr: 'مالي', dialCode: '+223', flag: '🇲🇱', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'BF', name: 'Burkina Faso', nameAr: 'بوركينا فاسو', dialCode: '+226', flag: '🇧🇫', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'NE', name: 'Niger', nameAr: 'النيجر', dialCode: '+227', flag: '🇳🇪', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'TD', name: 'Chad', nameAr: 'تشاد', dialCode: '+235', flag: '🇹🇩', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'MG', name: 'Madagascar', nameAr: 'مدغشقر', dialCode: '+261', flag: '🇲🇬', format: 'XX XX XXX XX', maxLength: 9 },
  { code: 'MU', name: 'Mauritius', nameAr: 'موريشيوس', dialCode: '+230', flag: '🇲🇺', format: 'XXXX XXXX', maxLength: 8 },
  { code: 'SC', name: 'Seychelles', nameAr: 'سيشل', dialCode: '+248', flag: '🇸🇨', format: 'X XX XX XX', maxLength: 7 },
  { code: 'CV', name: 'Cape Verde', nameAr: 'الرأس الأخضر', dialCode: '+238', flag: '🇨🇻', format: 'XXX XXXX', maxLength: 7 },
  { code: 'GM', name: 'Gambia', nameAr: 'غامبيا', dialCode: '+220', flag: '🇬🇲', format: 'XXX XXXX', maxLength: 7 },
  { code: 'GN', name: 'Guinea', nameAr: 'غينيا', dialCode: '+224', flag: '🇬🇳', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'GW', name: 'Guinea-Bissau', nameAr: 'غينيا بيساو', dialCode: '+245', flag: '🇬🇼', format: 'XXX XXXX', maxLength: 7 },
  { code: 'SL', name: 'Sierra Leone', nameAr: 'سيراليون', dialCode: '+232', flag: '🇸🇱', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'LR', name: 'Liberia', nameAr: 'ليبيريا', dialCode: '+231', flag: '🇱🇷', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'TG', name: 'Togo', nameAr: 'توغو', dialCode: '+228', flag: '🇹🇬', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'BJ', name: 'Benin', nameAr: 'بنين', dialCode: '+229', flag: '🇧🇯', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'GA', name: 'Gabon', nameAr: 'الغابون', dialCode: '+241', flag: '🇬🇦', format: 'X XX XX XX', maxLength: 7 },
  { code: 'GQ', name: 'Equatorial Guinea', nameAr: 'غينيا الاستوائية', dialCode: '+240', flag: '🇬🇶', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'CF', name: 'Central African Republic', nameAr: 'جمهورية أفريقيا الوسطى', dialCode: '+236', flag: '🇨🇫', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'SS', name: 'South Sudan', nameAr: 'جنوب السودان', dialCode: '+211', flag: '🇸🇸', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'ER', name: 'Eritrea', nameAr: 'إريتريا', dialCode: '+291', flag: '🇪🇷', format: 'X XXX XXX', maxLength: 7 },
  { code: 'BI', name: 'Burundi', nameAr: 'بوروندي', dialCode: '+257', flag: '🇧🇮', format: 'XX XX XXXX', maxLength: 8 },
  { code: 'MW', name: 'Malawi', nameAr: 'مالاوي', dialCode: '+265', flag: '🇲🇼', format: 'X XXXX XXXX', maxLength: 9 },
  { code: 'LS', name: 'Lesotho', nameAr: 'ليسوتو', dialCode: '+266', flag: '🇱🇸', format: 'XX XXX XXX', maxLength: 8 },
  { code: 'SZ', name: 'Eswatini', nameAr: 'إسواتيني', dialCode: '+268', flag: '🇸🇿', format: 'XX XX XXXX', maxLength: 8 },

  // Oceania
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dialCode: '+61', flag: '🇦🇺', format: 'XXX XXX XXX', maxLength: 9 },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', dialCode: '+64', flag: '🇳🇿', format: 'XX XXX XXXX', maxLength: 9 },
  { code: 'FJ', name: 'Fiji', nameAr: 'فيجي', dialCode: '+679', flag: '🇫🇯', format: 'XXX XXXX', maxLength: 7 },
  { code: 'PG', name: 'Papua New Guinea', nameAr: 'بابوا غينيا الجديدة', dialCode: '+675', flag: '🇵🇬', format: 'XXX XXXX', maxLength: 7 },
  { code: 'SB', name: 'Solomon Islands', nameAr: 'جزر سليمان', dialCode: '+677', flag: '🇸🇧', format: 'XX XXXXX', maxLength: 7 },
  { code: 'VU', name: 'Vanuatu', nameAr: 'فانواتو', dialCode: '+678', flag: '🇻🇺', format: 'XX XXXXX', maxLength: 7 },
  { code: 'NC', name: 'New Caledonia', nameAr: 'كاليدونيا الجديدة', dialCode: '+687', flag: '🇳🇨', format: 'XX XX XX', maxLength: 6 },
  { code: 'PF', name: 'French Polynesia', nameAr: 'بولينيزيا الفرنسية', dialCode: '+689', flag: '🇵🇫', format: 'XX XX XX XX', maxLength: 8 },
  { code: 'WS', name: 'Samoa', nameAr: 'ساموا', dialCode: '+685', flag: '🇼🇸', format: 'XX XXXXX', maxLength: 7 },
  { code: 'TO', name: 'Tonga', nameAr: 'تونغا', dialCode: '+676', flag: '🇹🇴', format: 'XXX XXXX', maxLength: 7 },
  { code: 'GU', name: 'Guam', nameAr: 'غوام', dialCode: '+1671', flag: '🇬🇺', format: 'XXX XXXX', maxLength: 7 },
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
