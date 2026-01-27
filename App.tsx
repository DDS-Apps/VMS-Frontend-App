import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ExpoSplashScreen from "expo-splash-screen";

import { KeyboardProviderWrapper } from "@/components/KeyboardProviderWrapper";
import { StatusBar } from "expo-status-bar";
import { useFonts } from 'expo-font';
import { getBootstrapPromise, getCachedLocale } from "@/utils/localeManager";

// Note: initializeRTLSync() is called in index.js before registerRootComponent()
// This ensures I18nManager is configured before any React rendering

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { PortalProvider } from "@/contexts/PortalContext";
import SplashScreen from "@/screens/Auth/SplashScreen";
import LoginScreen from "@/screens/Auth/LoginScreen";
import DashboardContainer from "@/navigation/DashboardContainer";
import VisitorInviteScreen from "@/screens/Visitor/VisitorInviteScreen";
import { ThemeContext } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { UserRole } from "@/types/vms.types";
import { setCurrentStaff } from "@/services/state/buffetAdminState";
import { setCurrentDriver } from "@/services/state/valetAdminState";


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
  const { layoutKey, isLoading: languageLoading, isRTL, locale, setLocale } = useLanguage();
  const [showSplash, setShowSplash] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [hasAppliedUserLanguage, setHasAppliedUserLanguage] = useState(false);

  useEffect(() => {
    const token = getInviteTokenFromUrl();
    if (token) {
      setInviteToken(token);
      // Don't hide splash yet - wait for language to load
    }
  }, []);

  // Sync language from user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.language && !hasAppliedUserLanguage) {
      const userLang = user.language;
      // Only change if different from current locale
      if (userLang !== locale) {
        console.log('[AppContent] Syncing user language from server:', userLang);
        setLocale(userLang);
        setHasAppliedUserLanguage(true);
      } else {
        setHasAppliedUserLanguage(true);
      }
    }
    // Reset when user logs out
    if (!isAuthenticated) {
      setHasAppliedUserLanguage(false);
    }
  }, [isAuthenticated, user?.language, locale, setLocale, hasAppliedUserLanguage]);

  const handleSplashFinish = () => {
    // Only hide splash if language loading is complete
    if (!languageLoading) {
      setShowSplash(false);
    }
  };

  // Keep splash visible while language is loading
  useEffect(() => {
    if (!languageLoading && !showSplash) {
      // Language loaded and splash was dismissed - ensure RTL is applied
      console.log('[AppContent] Language ready, isRTL:', isRTL);
    }
  }, [languageLoading, showSplash, isRTL]);

  // Safety timeout: force splash to hide if language loading takes too long
  // This prevents the app from being stuck on splash screen indefinitely
  const [forceBypassLanguageLoading, setForceBypassLanguageLoading] = useState(false);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (languageLoading || showSplash) {
        console.warn('[AppContent] Initialization timeout - forcing app to proceed');
        setShowSplash(false);
        setForceBypassLanguageLoading(true);
      }
    }, 5000); // 5 second timeout
    return () => clearTimeout(timeoutId);
  }, []);

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
  };

  // Show splash while language is loading OR while splash animation is still showing
  // Unless we've timed out and need to force bypass
  const effectiveLanguageLoading = languageLoading && !forceBypassLanguageLoading;
  
  console.log('[AppContent] Render state:', { 
    showSplash, 
    effectiveLanguageLoading, 
    authLoading, 
    isAuthenticated,
    hasUser: !!user,
    inviteToken: !!inviteToken
  });
  
  if (showSplash || effectiveLanguageLoading) {
    console.log('[AppContent] Showing SplashScreen');
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (inviteToken) {
    console.log('[AppContent] Showing VisitorInviteScreen');
    return (
      <VisitorInviteScreen 
        route={{ params: { token: inviteToken } }} 
      />
    );
  }

  if (authLoading) {
    console.log('[AppContent] Showing auth loading spinner');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background }]}>
        <ActivityIndicator size="large" color={isDarkMode ? Colors.dark.primary : Colors.light.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('[AppContent] Showing LoginScreen');
    return <LoginScreen key={layoutKey} onLoginSuccess={handleLoginSuccess} />;
  }

  const userName = user.name || user.email;
  const userRole = user.role as UserRole;
  const userPhotoUrl = user.photoUrl || user.thumbnailUrl;

  return (
    <DashboardContainer 
      key={layoutKey}
      userRole={userRole} 
      userName={userName}
      userEmail={user.email}
      userPhotoUrl={userPhotoUrl}
      onLogout={handleLogout}
      isSSOUser={user.isSSOUser}
    />
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [localeBootstrapReady, setLocaleBootstrapReady] = useState(() => {
    // On web, we don't need to wait for bootstrap (sync localStorage is available)
    // On mobile, wait for async bootstrap to populate the cache
    if (Platform.OS === 'web') return true;
    // If cache is already populated (e.g., hot reload), we're ready
    return getCachedLocale() !== null;
  });

  const [fontsLoaded, fontError] = useFonts({
    'Inter_400Regular': require('./assets/fonts/Inter_400Regular.ttf'),
    'Inter_500Medium': require('./assets/fonts/Inter_500Medium.ttf'),
    'Inter_600SemiBold': require('./assets/fonts/Inter_600SemiBold.ttf'),
    'Inter_700Bold': require('./assets/fonts/Inter_700Bold.ttf'),
  });

  // Wait for locale bootstrap on mobile before rendering LanguageProvider
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (localeBootstrapReady) return;
    
    let mounted = true;
    getBootstrapPromise().then(() => {
      if (mounted) {
        console.log('[App] Locale bootstrap complete, cached locale:', getCachedLocale());
        setLocaleBootstrapReady(true);
      }
    });
    return () => { mounted = false; };
  }, [localeBootstrapReady]);

  useEffect(() => {
    async function prepare() {
      try {
        if (fontError) {
          console.warn('[App] Font loading error:', fontError);
        }
        
        if (fontsLoaded || fontError) {
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn('[App] Error during app preparation:', e);
        setAppIsReady(true);
      }
    }
    
    prepare();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!appIsReady) {
   
        setAppIsReady(true);
      }
      // Also timeout locale bootstrap to prevent stuck splash
      if (!localeBootstrapReady) {
        console.warn('[App] Locale bootstrap timeout - proceeding with fallback');
        setLocaleBootstrapReady(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [appIsReady, localeBootstrapReady]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await ExpoSplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const themeValue = {
    isDark: isDarkMode,
    toggleTheme,
    theme: isDarkMode ? Colors.dark : Colors.light,
  };

  // Wait for both fonts and locale bootstrap before rendering
  // This ensures LanguageProvider gets the correct initial locale from cache
  if (!appIsReady || !localeBootstrapReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <LanguageProvider>
            <ThemeContext.Provider value={themeValue}>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
                  <KeyboardProviderWrapper>
                    <PortalProvider>
                      <ToastProvider>
                        <NotificationProvider>
                          <AppContent isDarkMode={isDarkMode} />
                        </NotificationProvider>
                        <StatusBar style={isDarkMode ? "light" : "dark"} />
                      </ToastProvider>
                    </PortalProvider>
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
