import React from 'react';
import { StyleSheet, View, ActivityIndicator, Modal, Platform, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageChangeOverlayProps {
  visible: boolean;
}

// Static text in both languages - avoid using translations during state transition
const OVERLAY_TEXT = {
  en: {
    title: 'Switching language...',
    web: 'Page will reload',
    mobile: 'App will restart',
  },
  ar: {
    title: 'جارٍ تغيير اللغة...',
    web: 'ستتم إعادة تحميل الصفحة',
    mobile: 'ستتم إعادة تشغيل التطبيق',
  },
};

export function LanguageChangeOverlay({ visible }: LanguageChangeOverlayProps) {
  const { theme } = useTheme();
  const { locale, isRTL } = useLanguage();
  
  // Use static text to avoid translation dependencies during state transition
  const text = OVERLAY_TEXT[locale] || OVERLAY_TEXT.en;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.text, { color: theme.text, textAlign: isRTL ? 'right' : 'center' }]}>
            {text.title}
          </Text>
          <Text style={[styles.subtext, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'center' }]}>
            {Platform.OS === 'web' ? text.web : text.mobile}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    gap: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  subtext: {
    fontSize: 13,
  },
});
