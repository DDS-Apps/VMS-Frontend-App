import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { DirectionalRow, useDirectionalStyle } from '@/components/DirectionalRow';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { pushNotificationService } from '@/services/push';
import { useLanguage } from '@/contexts/LanguageContext';
import { BorderRadius, Spacing } from '@/constants/theme';

const PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed';

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
      const dismissed = await AsyncStorage.getItem(PROMPT_DISMISSED_KEY);
      if (dismissed === 'true') {
        setIsVisible(false);
        return;
      }
      
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
      setIsLoading(false);
    }
    
    scale.value = withSpring(1);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    setIsVisible(false);
    onDismissed?.();
  };

  if (!isVisible) {
    return null;
  }

  const bellIcon = (
    <View style={styles.iconContainer}>
      <DDIcon name="bell" size={24} color={theme.primary} />
    </View>
  );

  const closeButton = (
    <Pressable onPress={handleDismiss} style={styles.closeButton}>
      <DDIcon name="x" size={18} color={theme.textSecondary} />
    </Pressable>
  );

  const enableButton = (
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
  );

  const laterButton = (
    <Pressable
      onPress={handleDismiss}
      style={styles.dismissButton}
    >
      <ThemedText variant="bodySmall" color={theme.textSecondary}>
        {t('notifications.enableLater')}
      </ThemedText>
    </Pressable>
  );

  const directionalStyle = useDirectionalStyle();
  
  return (
    <Animated.View 
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.container,
        directionalStyle,
        { 
          backgroundColor: theme.softOrange,
          borderColor: theme.primary,
        }
      ]}
    >
      {bellIcon}
      
      <View style={styles.content}>
        <ThemedText variant="bodySmall" style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('notifications.enablePromptTitle')}
        </ThemedText>
        <ThemedText 
          variant="caption" 
          color={theme.textSecondary}
          style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('notifications.enablePromptDescription')}
        </ThemedText>
        
        <DirectionalRow style={styles.buttonRow}>
          {enableButton}
          {laterButton}
        </DirectionalRow>
      </View>
      
      {closeButton}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
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
  },
});
