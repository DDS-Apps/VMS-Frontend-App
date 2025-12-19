import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { KeyboardProviderWrapper } from "@/components/KeyboardProviderWrapper";
import { StatusBar } from "expo-status-bar";
import { useFonts } from 'expo-font';

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";
import SplashScreen from "@/screens/SplashScreen";
import LoginScreen from "@/screens/LoginScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "@/screens/ResetPasswordScreen";
import DashboardContainer from "@/navigation/DashboardContainer";
import VisitorInviteScreen from "@/screens/Visitor/VisitorInviteScreen";
import { ThemeContext } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { UserRole } from "@/types/vms.types";
import { setCurrentStaff } from "@/services/mock/buffetAdminState";
import { setCurrentDriver } from "@/services/mock/valetAdminState";

type AuthScreen = 'login' | 'forgotPassword' | 'resetPassword';

function getInviteTokenFromUrl(): string | null {
  if (Platform.OS !== 'web') return null;
  
  try {
    const fullUrl = window.location.href;
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;
    
    console.log('[VMS] Full URL:', fullUrl);
    console.log('[VMS] Pathname:', pathname);
    console.log('[VMS] Hash:', hash);
    console.log('[VMS] Search:', search);
    
    // Check pathname first (e.g., /invite/TOKEN)
    const pathMatch = pathname.match(/\/invite\/([^\/\?#]+)/);
    if (pathMatch && pathMatch[1]) {
      console.log('[VMS] Found invite token in path:', pathMatch[1]);
      return pathMatch[1];
    }
    
    // Check hash (e.g., #/invite/TOKEN or #invite/TOKEN)
    const hashMatch = hash.match(/\/?invite\/([^\/\?#]+)/);
    if (hashMatch && hashMatch[1]) {
      console.log('[VMS] Found invite token in hash:', hashMatch[1]);
      return hashMatch[1];
    }
    
    // Check query params (e.g., ?token=TOKEN or ?invite=TOKEN)
    const urlParams = new URLSearchParams(search);
    const tokenParam = urlParams.get('token') || urlParams.get('invite');
    if (tokenParam) {
      console.log('[VMS] Found invite token in query params:', tokenParam);
      return tokenParam;
    }
    
    // Also check if the entire URL contains /invite/ pattern
    const urlMatch = fullUrl.match(/\/invite\/([A-Za-z0-9\-]+)/);
    if (urlMatch && urlMatch[1]) {
      console.log('[VMS] Found invite token in full URL:', urlMatch[1]);
      return urlMatch[1];
    }
    
    console.log('[VMS] No invite token found');
  } catch (e) {
    console.error('[VMS] Error accessing window:', e);
  }
  return null;
}

function AppContent({ isDarkMode }: { isDarkMode: boolean }) {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getInviteTokenFromUrl();
    if (token) {
      setInviteToken(token);
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleLoginSuccess = (role: UserRole) => {
    if (role === 'buffet_staff') {
      setCurrentStaff('staff_001', user?.name || 'Staff');
    }
    
    if (role === 'valet_driver') {
      setCurrentDriver('driver_001', user?.name || 'Driver');
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthScreen('login');
  };

  const handleForgotPassword = () => {
    setAuthScreen('forgotPassword');
  };

  const handleForgotPasswordSubmit = (email: string) => {
    setResetEmail(email);
    setAuthScreen('resetPassword');
  };

  const handleResetPasswordSubmit = () => {
    setAuthScreen('login');
    setResetEmail('');
  };

  const handleBackToLogin = () => {
    setAuthScreen('login');
    setResetEmail('');
  };

  if (inviteToken) {
    return (
      <VisitorInviteScreen 
        route={{ params: { token: inviteToken } }} 
      />
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDarkMode ? Colors.dark.primary : Colors.light.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    if (authScreen === 'forgotPassword') {
      return <ForgotPasswordScreen onSubmit={handleForgotPasswordSubmit} onBack={handleBackToLogin} />;
    }
    if (authScreen === 'resetPassword') {
      return <ResetPasswordScreen email={resetEmail} onSubmit={handleResetPasswordSubmit} onBack={handleBackToLogin} />;
    }
    return <LoginScreen onLoginSuccess={handleLoginSuccess} onForgotPassword={handleForgotPassword} />;
  }

  const userName = user.name || user.email;
  const userRole = user.role as UserRole;
  const userPhotoUrl = user.photoUrl || user.thumbnailUrl;

  return (
    <DashboardContainer 
      userRole={userRole} 
      userName={userName}
      userPhotoUrl={userPhotoUrl}
      onLogout={handleLogout}
      isSSOUser={user.isSSOUser}
    />
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isWeb = Platform.OS === 'web';
  const [fontTimeout, setFontTimeout] = useState(false);

  // Load fonts from local assets to avoid proxy issues on web
  const [fontsLoaded, fontError] = useFonts({
    'Inter_400Regular': require('./assets/fonts/Inter_400Regular.ttf'),
    'Inter_500Medium': require('./assets/fonts/Inter_500Medium.ttf'),
    'Inter_600SemiBold': require('./assets/fonts/Inter_600SemiBold.ttf'),
    'Inter_700Bold': require('./assets/fonts/Inter_700Bold.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.warn('[App] Font loading error:', fontError);
      setFontTimeout(true);
    }
  }, [fontError]);

  useEffect(() => {
    // Give fonts time to load, with timeout fallback
    const timer = setTimeout(() => {
      if (!fontsLoaded && !fontError) {
        console.warn('[App] Font loading timeout - proceeding without custom fonts');
        setFontTimeout(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const themeValue = {
    isDark: isDarkMode,
    toggleTheme,
    theme: isDarkMode ? Colors.dark : Colors.light,
  };

  if (!fontsLoaded && !fontTimeout) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeContext.Provider value={themeValue}>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProviderWrapper>
                    <ToastProvider>
                      <NotificationProvider>
                        <AppContent isDarkMode={isDarkMode} />
                      </NotificationProvider>
                      <StatusBar style={isDarkMode ? "light" : "dark"} />
                    </ToastProvider>
                  </KeyboardProviderWrapper>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </ThemeContext.Provider>
          </LanguageProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
