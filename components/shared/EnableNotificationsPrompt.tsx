import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { DDIcon } from '@/components/DDIcon';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { pushNotificationService } from '@/services/push';
import { useLanguage } from '@/contexts/LanguageContext';
import { BorderRadius, Spacing } from '@/constants/theme';

interface EnableNotificationsPromptProps {
  onEnabled?: () => void;
  onDismissed?: () => void;
}

export function EnableNotificationsPrompt({ 
  onEnabled, 
  onDismissed 
}: EnableNotificationsPromptProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    const checkPermission = async () => {
      const shouldShow = pushNotificationService.shouldShowEnablePrompt();
      if (shouldShow) {
        const status = await pushNotificationService.getPermissionStatus();
        setIsVisible(status === 'undetermined');
      }
    };
    checkPermission();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleEnable = async () => {
    setIsLoading(true);
    scale.value = withSpring(0.98);
    
    try {
      const success = await pushNotificationService.initialize();
      if (success) {
        setIsVisible(false);
        onEnabled?.();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[EnableNotificationsPrompt] Failed to enable:', error);
      setIsLoading(false);
    }
    
    scale.value = withSpring(1);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismissed?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container, 
        { 
          backgroundColor: theme.softOrange,
          borderColor: theme.primary,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <DDIcon name="bell" size={24} color={theme.primary} />
      </View>
      
      <View style={styles.content}>
        <ThemedText variant="bodySmall" style={styles.title}>
          {t('notifications.enablePromptTitle')}
        </ThemedText>
        <ThemedText 
          variant="caption" 
          color={theme.textSecondary}
          style={styles.description}
        >
          {t('notifications.enablePromptDescription')}
        </ThemedText>
        
        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={handleEnable}
            disabled={isLoading}
            style={[
              styles.enableButton,
              { backgroundColor: theme.primary },
              isLoading && styles.buttonDisabled,
            ]}
          >
            <ThemedText variant="bodySmall" color="#FFFFFF">
              {isLoading 
                ? t('notifications.enablingNotifications') 
                : t('notifications.enableButton')
              }
            </ThemedText>
          </Pressable>
          
          <Pressable
            onPress={handleDismiss}
            style={styles.dismissButton}
          >
            <ThemedText variant="bodySmall" color={theme.textSecondary}>
              {t('notifications.enableLater')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
      
      <Pressable onPress={handleDismiss} style={styles.closeButton}>
        <DDIcon name="x" size={18} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    marginEnd: Spacing.sm,
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    marginBottom: Spacing.sm,
  },
  buttonRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  enableButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  dismissButton: {
    paddingVertical: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.xs,
    marginStart: Spacing.xs,
  },
});
