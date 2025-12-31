import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { DDIcon, IconName } from '@/components/DDIcon';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { registerToastMethods, unregisterToastMethods, setGlobalLocale } from '@/utils/globalToast';
import { LanguageContext } from '@/contexts/LanguageContext';
import { defaultLocale } from '@/constants/i18n';
import { Portal } from '@/contexts/PortalContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 4000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getToastIcon = (type: ToastType): IconName => {
  switch (type) {
    case 'success':
      return 'check-circle';
    case 'error':
      return 'alert-circle';
    case 'warning':
      return 'alert-triangle';
    case 'info':
      return 'info';
  }
};

const getToastColors = (type: ToastType, isDark: boolean) => {
  const colors = isDark ? Colors.dark : Colors.light;
  
  switch (type) {
    case 'success':
      return {
        background: isDark ? '#0A2A1A' : '#E6F9F0',
        border: colors.success,
        icon: colors.success,
        text: colors.text,
      };
    case 'error':
      return {
        background: isDark ? '#2A0A0A' : '#FEECEB',
        border: colors.error,
        icon: colors.error,
        text: colors.text,
      };
    case 'warning':
      return {
        background: isDark ? '#2A2A0A' : '#FFF7E6',
        border: colors.warning,
        icon: colors.warning,
        text: colors.text,
      };
    case 'info':
      return {
        background: isDark ? '#0A1A3A' : '#EBF4FF',
        border: colors.info,
        icon: colors.info,
        text: colors.text,
      };
  }
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  index: number;
}

function ToastItem({ toast, onDismiss, index }: ToastItemProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  
  const colors = getToastColors(toast.type, isDark);
  const icon = getToastIcon(toast.type);

  React.useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 250 });

    const duration = toast.duration || TOAST_DURATION;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        animatedStyle,
        {
          top: insets.top + Spacing.sm + (index * 80),
          backgroundColor: colors.background,
          borderLeftColor: colors.border,
        },
      ]}
    >
      <View style={styles.toastContent}>
        <View style={[styles.iconContainer, { backgroundColor: colors.border + '20' }]}>
          <DDIcon name={icon} size={20} color={colors.icon} />
        </View>
        <View style={styles.textContainer}>
          {toast.title ? (
            <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          <Text style={[styles.toastMessage, { color: colors.text }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <DDIcon name="x" size={18} color={colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastIdRef.current}`;
    setToasts((prev) => {
      const newToasts = [...prev, { ...toast, id }];
      return newToasts.slice(-3);
    });
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title, duration: 5000 });
  }, [showToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  useEffect(() => {
    registerToastMethods({ showError, showSuccess, showWarning, showInfo });
    return () => {
      unregisterToastMethods();
    };
  }, [showError, showSuccess, showWarning, showInfo]);

  const languageContext = useContext(LanguageContext);
  const locale = languageContext?.locale ?? defaultLocale;
  const isLanguageLoading = languageContext?.isLoading ?? true;
  const isLocaleReady = !isLanguageLoading;
  
  useEffect(() => {
    setGlobalLocale(locale, isLocaleReady);
  }, [locale, isLocaleReady]);

  const toastContent = toasts.length > 0 ? (
    <View style={styles.toastWrapper} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={hideToast}
          index={index}
        />
      ))}
    </View>
  ) : null;

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showWarning, showInfo, hideToast }}>
      {children}
      {toasts.length > 0 ? (
        <Portal>
          {Platform.OS === 'web' ? (
            toastContent
          ) : (
            <Modal
              visible={true}
              transparent
              animationType="none"
              statusBarTranslucent
              presentationStyle="overFullScreen"
              hardwareAccelerated
              onRequestClose={() => {}}
            >
              {toastContent}
            </Modal>
          )}
        </Portal>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toastWrapper: {
    ...Platform.select({
      web: {
        position: 'fixed' as 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2147483647,
        pointerEvents: 'box-none',
      },
      default: {
        flex: 1,
        backgroundColor: 'transparent',
      },
    }),
  },
  toastContainer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    fontFamily: Typography.bodySmall.fontFamily,
  },
  toastMessage: {
    fontSize: Typography.bodySmall.fontSize,
    fontFamily: Typography.bodySmall.fontFamily,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  dismissButton: {
    padding: Spacing.xs,
    opacity: 0.7,
  },
});
