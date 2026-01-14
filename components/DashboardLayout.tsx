import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, I18nManager, useWindowDimensions, Image, Modal, Switch, Platform } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import Sidebar from "@/components/Sidebar";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { EnableNotificationsPrompt } from "@/components/shared/EnableNotificationsPrompt";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useRTLStyles } from "@/hooks/useRTLStyles";
import { UserRole } from "@/types/vms.types";
import { authService } from "@/services/api/authService";

const SIDEBAR_WIDTH_DESKTOP = 280;
const EDGE_SWIPE_THRESHOLD = 24;
const SWIPE_VELOCITY_THRESHOLD = 500;

// Synchronously determine RTL state for first render on web
function getInitialRTLState(): boolean {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('@vms_language');
      return stored === 'ar';
    } catch {
      return false;
    }
  }
  return I18nManager.isRTL;
}

interface DashboardLayoutProps {
  userRole: UserRole;
  userName: string;
  userPhotoUrl?: string | null;
  currentScreen: string;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
  onNavigateHome?: () => void;
  onLogout: () => void;
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  canGoBack?: boolean;
  onGoBack?: () => void;
  unreadNotificationCount?: number;
  isSSOUser?: boolean;
}

export default function DashboardLayout({
  userRole,
  userName,
  userPhotoUrl,
  currentScreen,
  onNavigate,
  onNavigateHome,
  onLogout,
  children,
  pageTitle,
  pageSubtitle,
  canGoBack = false,
  onGoBack,
  unreadNotificationCount = 0,
  isSSOUser = false,
}: DashboardLayoutProps) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { locale, setLocale, isRTL: contextIsRTL, layoutKey } = useLanguage();
  
  // Use synchronous localStorage check for first render, then context value
  const isRTL = Platform.OS === 'web' ? getInitialRTLState() || contextIsRTL : contextIsRTL;
  console.log('[DashboardLayout] isRTL:', isRTL, 'contextIsRTL:', contextIsRTL, 'locale:', locale);
  
  const { t } = useTranslation();
  const rtlStyles = useRTLStyles();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  
  const getInitials = (name: string | undefined | null): string => {
    if (!name) return '??';
    const trimmedName = name.trim();
    if (!trimmedName) return '??';
    const words = trimmedName.split(' ').filter(w => w.length > 0);
    if (words.length >= 2 && words[0] && words[1]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  };
  
  const handleLanguageToggle = async () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    // Persist language preference to server first
    try {
      await authService.updateProfile({ language: newLocale });
      console.log('[DashboardLayout] Language preference saved to server:', newLocale);
      // Only apply locally if server update succeeded
      await setLocale(newLocale);
      setProfileMenuVisible(false);
    } catch (error) {
      console.warn('[DashboardLayout] Failed to save language to server:', error);
      // Keep menu open so user knows something failed
      // Note: In a future enhancement, we could add a toast notification here
    }
  };
  
  // Calculate responsive values
  const isLargeScreen = width >= 768;
  const sidebarWidthMobile = Math.floor(width * 0.75);
  const sidebarWidth = isLargeScreen ? SIDEBAR_WIDTH_DESKTOP : sidebarWidthMobile;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const translateX = useSharedValue(isRTL ? sidebarWidth : -sidebarWidth);
  const prevIsLargeScreenRef = useRef<boolean | null>(null);
  
  // Sync sidebar state only when screen size crosses breakpoint
  useEffect(() => {
    const prevIsLargeScreen = prevIsLargeScreenRef.current;
    
    // React to breakpoint changes (including initial render)
    if (prevIsLargeScreen !== isLargeScreen) {
      if (isLargeScreen) {
        // Desktop: open sidebar
        setSidebarOpen(true);
        translateX.value = 0;
      } else if (prevIsLargeScreen !== null) {
        // Mobile (only close if switching from desktop, not on initial render)
        translateX.value = isRTL ? sidebarWidth : -sidebarWidth;
        setSidebarOpen(false);
      }
      prevIsLargeScreenRef.current = isLargeScreen;
    }
  }, [isLargeScreen, sidebarWidth, isRTL, translateX]);

  const openSidebar = () => {
    setSidebarOpen(true);
    setIsOverlayActive(true);
    translateX.value = withSpring(0, { 
      damping: 25, 
      stiffness: 200,
      mass: 0.8,
      overshootClamping: false,
    });
  };

  const closeSidebar = () => {
    setIsOverlayActive(false);
    translateX.value = withSpring(
      isRTL ? sidebarWidth : -sidebarWidth,
      { 
        damping: 25, 
        stiffness: 200,
        mass: 0.8,
        overshootClamping: false,
      },
      (finished) => {
        if (finished) {
          runOnJS(setSidebarOpen)(false);
        }
      }
    );
  };

  // Calculate hitSlop to restrict gesture to edge only
  // Shrink from opposite side by (width - threshold) so only edge strip is active
  const edgeHitSlop = isRTL
    ? { left: -(width - EDGE_SWIPE_THRESHOLD), right: 0, top: 0, bottom: 0 }
    : { left: 0, right: -(width - EDGE_SWIPE_THRESHOLD), top: 0, bottom: 0 };

  const isWeb = Platform.OS === 'web';
  
  const edgeSwipeGesture = Gesture.Pan()
    .enabled(!isWeb && !isLargeScreen && !sidebarOpen && !canGoBack)
    .hitSlop(edgeHitSlop)
    .activeOffsetX(isRTL ? [-30, 0] : [0, 30])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      'worklet';
      if (isRTL) {
        if (event.translationX < 0) {
          const newTranslateX = Math.max(0, sidebarWidth + event.translationX);
          translateX.value = newTranslateX;
        }
      } else {
        if (event.translationX > 0) {
          const newTranslateX = Math.min(0, -sidebarWidth + event.translationX);
          translateX.value = newTranslateX;
        }
      }
    })
    .onEnd((event) => {
      'worklet';
      const shouldOpen = isRTL
        ? event.translationX < -50 || event.velocityX < -SWIPE_VELOCITY_THRESHOLD
        : event.translationX > 50 || event.velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldOpen) {
        runOnJS(openSidebar)();
      } else {
        translateX.value = withSpring(isRTL ? sidebarWidth : -sidebarWidth, {
          damping: 25,
          stiffness: 200,
          mass: 0.8,
          overshootClamping: false,
        });
      }
    });

  const sidebarSwipeGesture = Gesture.Pan()
    .enabled(!isWeb && !isLargeScreen && sidebarOpen)
    .minDistance(30)
    .onUpdate((event) => {
      if (isRTL) {
        if (event.translationX > 0) {
          translateX.value = Math.min(sidebarWidth, event.translationX);
        }
      } else {
        if (event.translationX < 0) {
          translateX.value = Math.max(-sidebarWidth, event.translationX);
        }
      }
    })
    .onEnd((event) => {
      const shouldClose = isRTL
        ? event.translationX > 100 || event.velocityX > SWIPE_VELOCITY_THRESHOLD
        : event.translationX < -100 || event.velocityX < -SWIPE_VELOCITY_THRESHOLD;

      if (shouldClose) {
        runOnJS(closeSidebar)();
      } else {
        translateX.value = withSpring(0, { 
          damping: 25, 
          stiffness: 200,
          mass: 0.8,
          overshootClamping: false,
        });
      }
    });

  const sidebarAnimatedStyle = useAnimatedStyle(() => {
    const progress = isRTL
      ? 1 - translateX.value / sidebarWidth
      : 1 + translateX.value / sidebarWidth;
    
    return {
      transform: [{ translateX: translateX.value }],
      opacity: Math.max(0.3, Math.min(1, progress)),
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = isRTL
      ? 1 - translateX.value / sidebarWidth
      : 1 + translateX.value / sidebarWidth;
    return {
      opacity: Math.max(0, Math.min(0.5, opacity * 0.5)),
    };
  });

  return (
    <GestureDetector gesture={edgeSwipeGesture}>
      <View 
        key={layoutKey} 
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Mobile Header Bar */}
        {!isLargeScreen && (
          <ThemedView style={[
            styles.mobileHeader, 
            { 
              borderBottomColor: theme.border, 
              backgroundColor: theme.background,
              paddingTop: insets.top + Spacing.sm,
            },
          ]}>
            {/* Left cluster in LTR: menu/back + logo */}
            {/* DirectionalRow handles platform-specific RTL reversal */}
            <DirectionalRow style={styles.headerCluster} gap={Spacing.sm}>
              {canGoBack && onGoBack ? (
                <Pressable 
                  onPress={onGoBack} 
                  style={styles.menuButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <DDIcon 
                    name={isRTL ? "arrow-right" : "arrow-left"} 
                    size={24} 
                    color={theme.text} 
                  />
                </Pressable>
              ) : (
                <Pressable onPress={openSidebar} style={styles.menuButton}>
                  <DDIcon name="menu" size={24} color={theme.text} />
                </Pressable>
              )}
              
              <Pressable 
                onPress={() => {
                  if (onNavigateHome) {
                    onNavigateHome();
                  } else {
                    onNavigate('Dashboard');
                  }
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Image
                  source={isDark 
                    ? require("../assets/images/header-icon-dark.png")
                    : require("../assets/images/header-icon-light.png")
                  }
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </Pressable>
            </DirectionalRow>
            
            {/* Right cluster in LTR: bell + avatar */}
            <DirectionalRow style={styles.headerCluster} gap={Spacing.sm}>
              <Pressable 
                onPress={() => onNavigate('Notifications')} 
                style={({ pressed }) => [
                  styles.menuButton,
                  { opacity: pressed ? 0.5 : 1 }
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View>
                  <DDIcon
                    name="bell"
                    size={20}
                    color={theme.textSecondary}
                  />
                  {unreadNotificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <View style={[styles.notificationDot, { backgroundColor: theme.error }]} />
                    </View>
                  )}
                </View>
              </Pressable>
              
              <Pressable 
                onPress={() => setProfileMenuVisible(true)} 
                style={({ pressed }) => [
                  styles.avatarButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[Typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {getInitials(userName)}
                  </ThemedText>
                </View>
              </Pressable>
            </DirectionalRow>
          </ThemedView>
        )}
        
        <Modal
          visible={profileMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileMenuVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setProfileMenuVisible(false)}
          >
            <View style={[
              styles.profileDropdown, 
              { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                top: isLargeScreen ? 60 : insets.top + 60,
                ...(isRTL ? { left: Spacing.lg } : { right: Spacing.lg }),
              }
            ]}>
              <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
                <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[Typography.subtitle, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {getInitials(userName)}
                  </ThemedText>
                </View>
                <ThemedText style={[Typography.body, { fontWeight: '600', marginTop: Spacing.sm }]}>
                  {userName}
                </ThemedText>
              </View>
              
              <Pressable 
                style={({ pressed }) => [styles.dropdownItem, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => {
                  setProfileMenuVisible(false);
                  onNavigate('Settings');
                }}
              >
                <DirectionalRow gap={Spacing.md}>
                  <DDIcon name="user" size={20} variant="muted" />
                  <ThemedText style={Typography.body}>
                    {t('settings.profile')}
                  </ThemedText>
                </DirectionalRow>
              </Pressable>
              
              {!isSSOUser ? (
                <Pressable 
                  style={({ pressed }) => [styles.dropdownItem, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => {
                    setProfileMenuVisible(false);
                    onNavigate('ChangePassword');
                  }}
                >
                  <DirectionalRow gap={Spacing.md}>
                    <DDIcon name="lock" size={20} variant="muted" />
                    <ThemedText style={Typography.body}>
                      {t('settings.changePassword')}
                    </ThemedText>
                  </DirectionalRow>
                </Pressable>
              ) : null}
              
              <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
              
              <View style={styles.dropdownItem}>
                <DirectionalRow gap={Spacing.md} style={{ flex: 1 }}>
                  <DDIcon name="globe" size={20} variant="muted" />
                  <ThemedText style={[Typography.body, { flex: 1 }]}>
                    {t('settings.language')}
                  </ThemedText>
                  <View style={styles.languageToggle}>
                    <Pressable 
                      onPress={handleLanguageToggle}
                      style={[
                        styles.langOption,
                        locale === 'en' && { backgroundColor: theme.primary }
                      ]}
                    >
                      <ThemedText style={[Typography.caption, { color: locale === 'en' ? '#FFFFFF' : theme.textSecondary, fontWeight: '600' }]}>
                        EN
                      </ThemedText>
                    </Pressable>
                    <Pressable 
                      onPress={handleLanguageToggle}
                      style={[
                        styles.langOption,
                        locale === 'ar' && { backgroundColor: theme.primary }
                      ]}
                    >
                      <ThemedText style={[Typography.caption, { color: locale === 'ar' ? '#FFFFFF' : theme.textSecondary, fontWeight: '600' }]}>
                        AR
                      </ThemedText>
                    </Pressable>
                  </View>
                </DirectionalRow>
              </View>
              
              <View style={styles.dropdownItem}>
                <DirectionalRow gap={Spacing.md} style={{ flex: 1 }}>
                  <DDIcon name={isDark ? "moon" : "sun"} size={20} variant="muted" />
                  <ThemedText style={[Typography.body, { flex: 1 }]}>
                    {t('settings.darkMode')}
                  </ThemedText>
                  <Switch
                    value={isDark}
                    onValueChange={() => {
                      toggleTheme();
                    }}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </DirectionalRow>
              </View>
              
              <View style={[styles.dropdownDivider, { backgroundColor: theme.border }]} />
              
              <Pressable 
                style={({ pressed }) => [styles.dropdownItem, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => {
                  setProfileMenuVisible(false);
                  onLogout();
                }}
              >
                <DirectionalRow gap={Spacing.md}>
                  <DDIcon name="log-out" size={20} color={theme.error} directionAware />
                  <ThemedText style={[Typography.body, { color: theme.error }]}>
                    {t('auth.signOut')}
                  </ThemedText>
                </DirectionalRow>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <View 
          testID="main-container"
          nativeID="main-container"
          // @ts-ignore - dataSet is supported by React Native Web
          dataSet={{ rtl: isRTL ? 'true' : 'false' }}
          style={[styles.mainContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {/* Mobile Overlay - Rendered first so sidebar appears on top */}
          {!isLargeScreen && sidebarOpen && (
            <Animated.View
              style={[
                styles.overlay,
                overlayAnimatedStyle,
              ]}
              pointerEvents={isOverlayActive ? 'auto' : 'none'}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
            </Animated.View>
          )}

          {/* Mobile Sidebar - absolute positioned */}
          {!isLargeScreen && sidebarOpen && (
            <GestureDetector gesture={sidebarSwipeGesture}>
              <Animated.View
                style={[
                  styles.sidebarContainer,
                  styles.sidebarMobile,
                  { width: sidebarWidthMobile },
                  sidebarAnimatedStyle,
                  isRTL && { left: 'auto', right: 0 },
                ]}
              >
                <Sidebar
                  userRole={userRole}
                  userName={userName}
                  currentScreen={currentScreen}
                  onNavigate={onNavigate}
                  onLogout={onLogout}
                  onToggleDarkMode={toggleTheme}
                  isDarkMode={isDark}
                  isOpen={sidebarOpen}
                  onClose={closeSidebar}
                />
              </Animated.View>
            </GestureDetector>
          )}

          {/* Desktop Sidebar */}
          {isLargeScreen && (
            <View
              style={[
                styles.sidebarContainer,
                { width: SIDEBAR_WIDTH_DESKTOP, zIndex: 10 },
              ]}
            >
              <Sidebar
                userRole={userRole}
                userName={userName}
                userPhotoUrl={userPhotoUrl}
                currentScreen={currentScreen}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onToggleDarkMode={toggleTheme}
                isDarkMode={isDark}
                isOpen={sidebarOpen}
                onClose={closeSidebar}
              />
            </View>
          )}

          {/* Main Content */}
          <View style={styles.content}>
            {/* Desktop Header Bar */}
            {isLargeScreen && (
              <View style={[
                styles.desktopHeader,
                { 
                  borderBottomColor: theme.border, 
                  backgroundColor: theme.background,
                },
              ]}>
                {isRTL ? (
                  <>
                    {/* RTL: notification+avatar on LEFT, page title on RIGHT */}
                    <View style={styles.desktopHeaderRight}>
                      <Pressable 
                        onPress={() => setProfileMenuVisible(true)} 
                        style={({ pressed }) => [
                          styles.desktopAvatarButton,
                          { opacity: pressed ? 0.7 : 1 }
                        ]}
                      >
                        <DDIcon name="chevron-down" size={16} color={theme.textSecondary} />
                        <ThemedText style={[Typography.body, { marginEnd: Spacing.sm, fontWeight: '500' }]}>
                          {userName}
                        </ThemedText>
                        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                          <ThemedText style={[Typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {getInitials(userName)}
                          </ThemedText>
                        </View>
                      </Pressable>
                      
                      <Pressable 
                        onPress={() => onNavigate('Notifications')} 
                        style={({ pressed }) => [
                          styles.desktopHeaderButton,
                          { opacity: pressed ? 0.5 : 1, backgroundColor: pressed ? theme.border : 'transparent' }
                        ]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <View>
                          <DDIcon
                            name="bell"
                            size={20}
                            color={theme.textSecondary}
                          />
                          {unreadNotificationCount > 0 ? (
                            <View style={styles.notificationBadge}>
                              <View style={[styles.notificationDot, { backgroundColor: theme.error }]} />
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    </View>
                    
                    <View style={styles.desktopHeaderLeft}>
                      {pageTitle ? (
                        <View>
                          <ThemedText style={[Typography.subtitle, { fontWeight: '600', textAlign: 'right' }]}>
                            {pageTitle}
                          </ThemedText>
                          {pageSubtitle ? (
                            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2, textAlign: 'right' }]}>
                              {pageSubtitle}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                      {canGoBack && onGoBack ? (
                        <Pressable 
                          onPress={onGoBack} 
                          style={[styles.menuButton, { marginStart: Spacing.md }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <DDIcon 
                            name="arrow-right" 
                            size={24} 
                            color={theme.text} 
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <>
                    {/* LTR: page title on LEFT, notification+avatar on RIGHT */}
                    <View style={styles.desktopHeaderLeft}>
                      {canGoBack && onGoBack ? (
                        <Pressable 
                          onPress={onGoBack} 
                          style={[styles.menuButton, { marginEnd: Spacing.md }]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <DDIcon 
                            name="arrow-left" 
                            size={24} 
                            color={theme.text} 
                          />
                        </Pressable>
                      ) : null}
                      {pageTitle ? (
                        <View>
                          <ThemedText style={[Typography.subtitle, { fontWeight: '600' }]}>
                            {pageTitle}
                          </ThemedText>
                          {pageSubtitle ? (
                            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                              {pageSubtitle}
                            </ThemedText>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                    
                    <View style={styles.desktopHeaderRight}>
                      <Pressable 
                        onPress={() => onNavigate('Notifications')} 
                        style={({ pressed }) => [
                          styles.desktopHeaderButton,
                          { opacity: pressed ? 0.5 : 1, backgroundColor: pressed ? theme.border : 'transparent' }
                        ]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <View>
                          <DDIcon
                            name="bell"
                            size={20}
                            color={theme.textSecondary}
                          />
                          {unreadNotificationCount > 0 ? (
                            <View style={styles.notificationBadge}>
                              <View style={[styles.notificationDot, { backgroundColor: theme.error }]} />
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                      
                      <Pressable 
                        onPress={() => setProfileMenuVisible(true)} 
                        style={({ pressed }) => [
                          styles.desktopAvatarButton,
                          { opacity: pressed ? 0.7 : 1 }
                        ]}
                      >
                        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                          <ThemedText style={[Typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {getInitials(userName)}
                          </ThemedText>
                        </View>
                        <ThemedText style={[Typography.body, { marginStart: Spacing.sm, fontWeight: '500' }]}>
                          {userName}
                        </ThemedText>
                        <DDIcon name="chevron-down" size={16} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
            
            <View style={styles.contentInner}>
              {Platform.OS === 'web' && <EnableNotificationsPrompt />}
              {children}
            </View>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  menuButton: {
    padding: Spacing.xs,
    marginEnd: Spacing.xs,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    // Width applied dynamically in JSX based on screen size
  },
  sidebarMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  contentInner: {
    flex: 1,
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  desktopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desktopHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  desktopHeaderButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  desktopAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'transparent',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginStart: Spacing.md,
  },
  avatarButton: {
    marginStart: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  profileDropdown: {
    position: 'absolute',
    width: 260,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dropdownDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  languageToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  langOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
