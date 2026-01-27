import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spacing, BorderRadius } from '@/constants/theme';

interface InAppNotificationToastProps {
  visible: boolean;
  title: string;
  body: string;
  onDismiss: () => void;
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export function InAppNotificationToast({
  visible,
  title,
  body,
  onDismiss,
  duration = 4000,
  type = 'info',
}: InAppNotificationToastProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'alert-circle';
      default:
        return 'bell';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'error':
        return theme.error;
      default:
        return theme.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.sm,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        style={[
          styles.toast,
          {
            backgroundColor: theme.surface,
            borderStartColor: getAccentColor(),
            shadowColor: theme.text,
            flexDirection: 'row',
          },
        ]}
        onPress={hideToast}
      >
        <View style={[styles.iconContainer, { backgroundColor: getAccentColor() + '20' }]}>
          <DDIcon name={getIconName()} size={20} color={getAccentColor()} />
        </View>
        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.body, { color: theme.textSecondary }]} numberOfLines={2}>
            {body}
          </ThemedText>
        </View>
        <Pressable onPress={hideToast} style={styles.closeButton}>
          <DDIcon name="x" size={18} color={theme.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    ...Platform.select({
      web: {
        maxWidth: 400,
        alignSelf: 'center',
        left: '50%',
        transform: [{ translateX: -200 }],
      },
    }),
  },
  toast: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderStartWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginStart: Spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: Spacing.xs,
  },
});

export default InAppNotificationToast;
