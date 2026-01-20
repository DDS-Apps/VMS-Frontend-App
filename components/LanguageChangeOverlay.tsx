import React from 'react';
import { StyleSheet, View, ActivityIndicator, Modal, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageChangeOverlayProps {
  visible: boolean;
}

export function LanguageChangeOverlay({ visible }: LanguageChangeOverlayProps) {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();

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
          <ThemedText style={[styles.text, { color: theme.text, textAlign: isRTL ? 'right' : 'center' }]}>
            {t('settings.changingLanguage') || 'Switching language...'}
          </ThemedText>
          <ThemedText style={[styles.subtext, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'center' }]}>
            {Platform.OS === 'web' 
              ? (t('settings.pageWillReload') || 'Page will reload')
              : (t('settings.appWillRestart') || 'App will restart')}
          </ThemedText>
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
