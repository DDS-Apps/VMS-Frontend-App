import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useLanguage } from '@/contexts/LanguageContext';
import { getQrAccessState, type QrAccessSource } from '@/utils/qrAccess';

export const qrAccessCopy = {
  en: {
    notActive: 'Not active yet',
    valid: 'Valid',
    retained: 'Valid until checkout or 9 PM.',
    expired: 'Expired',
    unavailable: 'QR validity unavailable. Refresh to check access.',
    invalidSchedule: 'Invalid schedule; access denied. Contact your host.',
    revocationPending: 'Revocation pending — access expired; device cleanup pending.',
  },
  ar: {
    notActive: 'غير مفعّل بعد',
    valid: 'صالح',
    retained: 'صالح حتى تسجيل الخروج أو الساعة 9 مساءً.',
    expired: 'منتهي الصلاحية',
    unavailable: 'صلاحية رمز QR غير متاحة. حدّث الصفحة للتحقق من الدخول.',
    invalidSchedule: 'جدول زيارة غير صالح؛ الدخول غير مسموح. تواصل مع المضيف.',
    revocationPending: 'إلغاء الوصول قيد التنفيذ — انتهت الصلاحية وتنظيف الجهاز قيد الانتظار.',
  },
};

export function QrAccessNotice({ source, now }: { source: QrAccessSource; now?: number }) {
  const { isRTL } = useLanguage();
  const state = getQrAccessState(source, now);
  return (
    <View style={{ paddingVertical: 8 }} accessibilityLiveRegion="polite">
      <ThemedText testID={`qr-access-${state}`} style={{ fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
        {qrAccessCopy[isRTL ? 'ar' : 'en'][state]}
      </ThemedText>
    </View>
  );
}
