import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, I18nManager, ActivityIndicator, Platform } from "react-native";
import { BrandColors, Spacing, Typography } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DDIcon } from "@/components/DDIcon";
import { LoadingButton } from "@/components/shared/LoadingButton";

type SplashState = 'loading' | 'checking_health' | 'checking_auth' | 'error' | 'ready';

interface SplashScreenProps {
  onFinish: (isAuthenticated: boolean, userRole?: string) => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const isRTL = I18nManager.isRTL;
  const { t } = useTranslation();
  const { checkHealth, isTokenValid, user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [splashState, setSplashState] = useState<SplashState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);

  const logoSource = require("@/assets/images/logo.png");

  const performHealthCheck = async (): Promise<boolean> => {
    // Skip health check on web - proceed directly to login
    if (Platform.OS === 'web') {
      return true;
    }
    try {
      const isHealthy = await checkHealth();
      return isHealthy;
    } catch (error) {
      return false;
    }
  };

  const initializeApp = async () => {
    setSplashState('ready');
    setTimeout(() => {
      onFinish(false);
    }, 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initializeApp();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (splashState === 'checking_auth' && !authLoading) {
      if (isAuthenticated && user) {
        setSplashState('ready');
        setTimeout(() => {
          onFinish(true, user.role);
        }, 500);
      } else {
        setSplashState('ready');
        setTimeout(() => {
          onFinish(false);
        }, 500);
      }
    }
  }, [authLoading, isAuthenticated, user, splashState]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await initializeApp();
    setIsRetrying(false);
  };

  const getStatusMessage = (): string => {
    switch (splashState) {
      case 'loading':
        return '';
      case 'checking_health':
        return t('splash.checkingConnection') || 'Checking connection...';
      case 'checking_auth':
        return t('splash.verifyingSession') || 'Verifying session...';
      case 'ready':
        return '';
      case 'error':
        return '';
      default:
        return '';
    }
  };

  if (splashState === 'error') {
    return (
      <View style={styles.container}>
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.errorContainer}>
          <DDIcon name="wifi-off" size={48} color="#FFFFFF" />
          <ThemedText style={styles.errorTitle}>
            {t('errors.connectionError') || 'Connection Error'}
          </ThemedText>
          <ThemedText style={styles.errorMessage}>
            {errorMessage}
          </ThemedText>
          <LoadingButton
            onPress={handleRetry}
            loading={isRetrying}
            variant="secondary"
            size="medium"
            style={styles.retryButton}
          >
            {t('common.retry') || 'Retry'}
          </LoadingButton>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={styles.logo}
        resizeMode="contain"
      />
      {splashState !== 'loading' && splashState !== 'ready' ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <ThemedText style={styles.statusText}>
            {getStatusMessage()}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BrandColors.brandGrey,
  },
  logo: {
    width: 320,
    height: 120,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusText: {
    color: '#FFFFFF',
    ...Typography.bodySmall,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    color: '#FFFFFF',
    ...Typography.title,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    minWidth: 120,
  },
});
