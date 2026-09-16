import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View, ActivityIndicator, Platform, AppState, Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ExpoSplashScreen from "expo-splash-screen";

import { KeyboardProviderWrapper } from "@/components/KeyboardProviderWrapper";
import { StatusBar } from "expo-status-bar";
import { useFonts } from 'expo-font';
import { nativeFontMap } from "@/constants/fonts";
import { injectWebFontFaces } from "@/utils/webFonts";
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
import { apiConfig } from "@/api/config";
import PrivacyPolicyScreen from "@/screens/Legal/PrivacyPolicyScreen";
import TermsConditionsScreen from "@/screens/Legal/TermsConditionsScreen";
import { navigationRef } from "@/navigation/navigationRef";
import { ROUTES } from "@/constants/routes";

// Web only (no-op elsewhere): declare the app fonts as @font-face rules before
// the first render so styles resolve to them as soon as each file arrives.
injectWebFontFaces();

type LegalPage = 'privacy-policy' | 'terms-conditions' | null;

type WebPrefill = {
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
} | null;

type WebRequestFormLink = {
  prefill: WebPrefill;
};

/** Normalizes the legacy Outlook path to the current request form path. */
function normalizeRequestFormPath(): string | null {
  if (Platform.OS !== 'web') return null;

  const pathname = window.location.pathname;
  if (!pathname.startsWith('/visits/new')) return pathname;

  const canonicalPathname = pathname.replace(/^\/visits\/new/, '/requests/new');
  window.history.replaceState(
    {},
    '',
    `${canonicalPathname}${window.location.search}${window.location.hash}`,
  );
  return canonicalPathname;
}

/** Reads a visitor request-form link on web and returns any pre-fill params.
 *  Supports both the legacy Outlook path and the current request path. */
function getRequestFormLinkFromUrl(): WebRequestFormLink | null {
  if (Platform.OS !== 'web') return null;
  try {
    const pathname = normalizeRequestFormPath() ?? window.location.pathname;
    if (!pathname.startsWith('/requests/new')) return null;
    const params = new URLSearchParams(window.location.search);
    const name    = params.get('name')    ?? undefined;
    const email   = params.get('email')   ?? undefined;
    const company = params.get('company') ?? undefined;
    const phone   = params.get('phone')   ?? undefined;
    window.history.replaceState({}, '', pathname);
    return { prefill: { name, email, company, phone } };
  } catch {
    return null;
  }
}

/** Routes a universal / App Link URL to the correct navigator screen. */
function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    const path   = parsed.pathname;
    const p      = Object.fromEntries(parsed.searchParams.entries());

    if (path.startsWith('/requests/new')) {
      navigationRef.navigate(ROUTES.VISITOR_REQUEST_FORM as any, {
        prefill: { name: p.name, email: p.email, company: p.company, phone: p.phone },
      } as any);
      return;
    }

    const inviteMatch = path.match(/^\/invite\/([a-f0-9-]+)$/i);
    if (inviteMatch) {
      navigationRef.navigate(ROUTES.VISITOR_INVITE as any, { token: inviteMatch[1] } as any);
      return;
    }

    const requestMatch = path.match(/^\/requests\/([a-f0-9-]+)$/i);
    if (requestMatch) {
      navigationRef.navigate(ROUTES.REQUEST_DETAILS as any, { requestId: requestMatch[1] } as any);
      return;
    }

    navigationRef.navigate(ROUTES.DASHBOARD as any);
  } catch (e) {
    console.warn('[VMS] Deep link parse error:', url, e);
  }
}

function getLegalPageFromUrl(): LegalPage {
  if (Platform.OS !== 'web') return null;

  try {
    const pathname = window.location.pathname;
    if (pathname === '/privacy-policy' || pathname.startsWith('/privacy-policy')) {
      return 'privacy-policy';
    }
    if (pathname === '/terms-conditions' || pathname.startsWith('/terms-conditions')) {
      return 'terms-conditions';
    }
  } catch (e) {
    console.error('[VMS] Error checking legal page URL:', e);
  }
  return null;
}

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
  const { user, isAuthenticated, isLoading: authLoading, logout, userDataVersion, refreshUser } = useAuth();
  const { layoutKey, isLoading: languageLoading, isRTL, locale, setLocale } = useLanguage();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [legalPage, setLegalPage] = useState<LegalPage>(null);
  const [hasAppliedUserLanguage, setHasAppliedUserLanguage] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const [webRequestFormLink, setWebRequestFormLink] = useState<WebRequestFormLink | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isAuthenticated
      ) {
        refreshUser();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    const legal = getLegalPageFromUrl();
    if (legal) { setLegalPage(legal); return; }
    const token = getInviteTokenFromUrl();
    if (token) { setInviteToken(token); return; }
    // Web: capture the request-form destination and any Outlook prefill params.
    const requestFormLink = getRequestFormLinkFromUrl();
    if (requestFormLink) setWebRequestFormLink(requestFormLink);
  }, []);

  // Mobile: subscribe to universal / App Link deep links
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Cold launch — link that opened the app
    Linking.getInitialURL().then((url) => { if (url) setPendingDeepLink(url); });
    // Warm launch — link tapped while app is running
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (isAuthenticated && navigationRef.isReady()) {
        handleDeepLink(url);
      } else {
        setPendingDeepLink(url);
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate pending mobile deep link once authenticated + nav ready
  useEffect(() => {
    if (!pendingDeepLink || !isAuthenticated || authLoading) return;
    const attempt = () => {
      if (navigationRef.isReady()) {
        handleDeepLink(pendingDeepLink);
        setPendingDeepLink(null);
      } else {
        setTimeout(attempt, 150);
      }
    };
    setTimeout(attempt, 400);
  }, [pendingDeepLink, isAuthenticated, authLoading]);

  // Navigate web request-form route once authenticated + nav ready
  useEffect(() => {
    if (!webRequestFormLink || !isAuthenticated || authLoading) return;
    const attempt = () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate(
          ROUTES.VISITOR_REQUEST_FORM as any,
          { prefill: webRequestFormLink.prefill } as any,
        );
        setWebRequestFormLink(null);
      } else {
        setTimeout(attempt, 150);
      }
    };
    setTimeout(attempt, 400);
  }, [webRequestFormLink, isAuthenticated, authLoading]);

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

  // The branded splash stays up only while startup work is genuinely pending
  // (locale verification, session restore) and hands off the moment both are
  // done. It adds no fixed delay of its own.
  const isBooting = languageLoading || authLoading;

  // Safety timeout: if startup work is still pending after 5 s (for example a
  // hung profile request), stop holding the splash so the app can never be
  // stuck on it indefinitely. The timer is armed only while booting.
  const [forceBypassBoot, setForceBypassBoot] = useState(false);

  useEffect(() => {
    if (!isBooting || forceBypassBoot) return;
    const timeoutId = setTimeout(() => {
      console.warn('[AppContent] Initialization timeout - forcing app to proceed');
      setForceBypassBoot(true);
    }, 5000); // 5 second timeout
    return () => clearTimeout(timeoutId);
  }, [isBooting, forceBypassBoot]);

  useEffect(() => {
    if (!isBooting) {
      console.log('[AppContent] Startup ready, isRTL:', isRTL);
    }
  }, [isBooting, isRTL]);

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

  // Hold the splash while the locale is still being verified, unless the
  // failsafe has fired.
  const effectiveLanguageLoading = languageLoading && !forceBypassBoot;
  
  console.log('[AppContent] Render state:', { 
    effectiveLanguageLoading, 
    authLoading, 
    isAuthenticated,
    hasUser: !!user,
    inviteToken: !!inviteToken
  });
  
  if (effectiveLanguageLoading) {
    console.log('[AppContent] Showing SplashScreen');
    return <SplashScreen />;
  }

  if (legalPage) {
    console.log('[AppContent] Showing legal page:', legalPage);
    if (legalPage === 'privacy-policy') {
      return <PrivacyPolicyScreen />;
    }
    return <TermsConditionsScreen />;
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
    if (!forceBypassBoot) {
      // Session restore is still pending (storage reads, or the server when no
      // profile is cached): keep the branded splash rather than flashing a
      // bare spinner between it and the first screen.
      console.log('[AppContent] Showing SplashScreen while session restores');
      return <SplashScreen />;
    }
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
  const rawPhotoUrl = user.thumbnailUrl || user.photoUrl;
  const userPhotoUrl = rawPhotoUrl 
    ? `${rawPhotoUrl.startsWith('http') ? rawPhotoUrl : `${apiConfig.baseUrl}${rawPhotoUrl}`}${rawPhotoUrl.includes('?') ? '&' : '?'}v=${userDataVersion}`
    : undefined;

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
  // Web renders immediately with fallback fonts and lets the custom fonts swap
  // in as they arrive. Native keeps waiting for the font set so the first frame
  // is drawn with the final fonts (the OS splash covers the wait there).
  const [appIsReady, setAppIsReady] = useState(Platform.OS === 'web');
  const [localeBootstrapReady, setLocaleBootstrapReady] = useState(() => {
    // On web, we don't need to wait for bootstrap (sync localStorage is available)
    // On mobile, wait for async bootstrap to populate the cache
    if (Platform.OS === 'web') return true;
    // If cache is already populated (e.g., hot reload), we're ready
    return getCachedLocale() !== null;
  });

  // Native registers the font set before first render (the OS splash covers
  // the wait). On web the map is empty: fonts are CSS @font-face rules that the
  // browser loads lazily, so first paint never waits on them.
  const [fontsLoaded, fontError] = useFonts(nativeFontMap);

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

  useEffect(() => {
    if (appIsReady && localeBootstrapReady) {
      ExpoSplashScreen.hideAsync().catch(() => {});
    }
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
