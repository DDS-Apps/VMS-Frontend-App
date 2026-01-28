import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform, Dimensions } from "react-native";
import { Image } from "expo-image";
import { DDIcon, IconName } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import SidebarGroup from "@/components/SidebarGroup";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRTLStyles } from "@/hooks/useRTLStyles";
import { UserRole } from "@/types/vms.types";
import Constants from 'expo-constants';

interface MenuItem {
  id: string;
  labelKey: string;
  icon: IconName;
  screen?: string;
  params?: Record<string, unknown>;
}

interface MenuGroup {
  id: string;
  labelKey: string;
  icon: IconName;
  items: MenuItem[];
  badgeKey?: string;
}

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userPhotoUrl?: string | null;
  currentScreen: string;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
  onLogout: () => void;
  onToggleDarkMode: () => void;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  pendingApprovalsCount?: number;
  todaysVisitorsCount?: number;
}

const getMenuGroups = (role: UserRole): { groups: MenuGroup[]; standalone: MenuItem[] } => {
  const result: { groups: MenuGroup[]; standalone: MenuItem[] } = {
    groups: [],
    standalone: [],
  };

  if (role === 'employee') {
    result.standalone = [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: 'grid', screen: 'Dashboard' },
    ];
    result.groups = [
      {
        id: 'visits',
        labelKey: 'sidebar.visitsRequests',
        icon: 'users',
        items: [
          { id: 'new_request', labelKey: 'navigation.newRequest', icon: 'user-plus', screen: 'VisitTypeSelection' },
          { id: 'visitor_requests', labelKey: 'navigation.myRequests', icon: 'list', screen: 'VisitorRequests' },
        ],
      },
    ];
  } else if (role === 'manager') {
    result.standalone = [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: 'grid', screen: 'Dashboard' },
    ];
    result.groups = [
      {
        id: 'visits',
        labelKey: 'sidebar.visitsRequests',
        icon: 'users',
        items: [
          { id: 'new_request', labelKey: 'navigation.newRequest', icon: 'user-plus', screen: 'VisitTypeSelection' },
          { id: 'visitor_requests', labelKey: 'navigation.myRequests', icon: 'list', screen: 'VisitorRequests' },
          { id: 'pending_approvals', labelKey: 'navigation.pendingApprovals', icon: 'check-circle', screen: 'PendingApprovals' },
        ],
        badgeKey: 'pendingApprovals',
      },
    ];
  } else if (role === 'receptionist') {
    result.standalone = [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: 'grid', screen: 'ReceptionistDashboard' },
    ];
    result.groups = [
      {
        id: 'visitors',
        labelKey: 'sidebar.visitors',
        icon: 'users',
        badgeKey: 'todaysVisitors',
        items: [
          { id: 'todays_visitors', labelKey: 'navigation.todaysVisitors', icon: 'clock', screen: 'AllVisitorsToday' },
          { id: 'all_visitors', labelKey: 'navigation.allVisitors', icon: 'users', screen: 'AllVisitors' },
        ],
      },
      {
        id: 'registration',
        labelKey: 'sidebar.registration',
        icon: 'user-plus',
        items: [
          { id: 'walk_in', labelKey: 'navigation.walkInRegistration', icon: 'user-plus', screen: 'WalkInRegistration' },
        ],
      },
    ];
  } else if (role === 'security') {
    result.standalone = [];
    result.groups = [
      {
        id: 'operations',
        labelKey: 'sidebar.operations',
        icon: 'shield',
        items: [
          { id: 'check_in', labelKey: 'navigation.visitorVerification', icon: 'shield', screen: 'CheckIn' },
        ],
      },
    ];
  } else if (role === 'valet_driver') {
    result.standalone = [
      { id: 'my_tasks', labelKey: 'navigation.myTasks', icon: 'list', screen: 'DriverTasks' },
    ];
    result.groups = [];
  } else if (role === 'buffet_staff') {
    result.standalone = [
      { id: 'buffet_board', labelKey: 'navigation.buffetBoard', icon: 'clipboard', screen: 'BuffetBoard' },
    ];
    result.groups = [];
  } else if (role === 'buffet_admin') {
    result.standalone = [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: 'grid', screen: 'BuffetAdminDashboard' },
    ];
    result.groups = [
      {
        id: 'requests',
        labelKey: 'sidebar.requests',
        icon: 'clipboard',
        items: [
          { id: 'buffet_requests', labelKey: 'navigation.buffetRequests', icon: 'list', screen: 'BuffetAllRequests' },
        ],
      },
    ];
  } else if (role === 'valet_admin') {
    result.standalone = [
      { id: 'parking_dashboard', labelKey: 'navigation.parkingDashboard', icon: 'truck', screen: 'ValetAllRequests' },
    ];
    result.groups = [];
  } else if (role === 'building_admin') {
    result.standalone = [
      { id: 'all_requests', labelKey: 'navigation.allRequests', icon: 'file-text', screen: 'AllRequests' },
    ];
    result.groups = [
      {
        id: 'users_config',
        labelKey: 'sidebar.usersConfig',
        icon: 'users',
        items: [
          { id: 'users_roles', labelKey: 'navigation.manageUsers', icon: 'users', screen: 'UsersRoles' },
          { id: 'reminder_rules', labelKey: 'navigation.reminderRules', icon: 'clock', screen: 'ReminderRules' },
        ],
      },
    ];
  } else {
    result.standalone = [
      { id: 'dashboard', labelKey: 'navigation.dashboard', icon: 'grid', screen: 'Dashboard' },
    ];
    result.groups = [];
  }

  return result;
};

export default function Sidebar({
  userRole,
  userName,
  userPhotoUrl,
  currentScreen,
  onNavigate,
  onLogout,
  onToggleDarkMode,
  isDarkMode,
  isOpen,
  onClose,
  pendingApprovalsCount = 0,
  todaysVisitorsCount = 0,
}: SidebarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL, layoutKey } = useLanguage();
  const rtlStyles = useRTLStyles();
  const { groups, standalone } = getMenuGroups(userRole);
  const { width } = Dimensions.get('window');
  const isLargeScreen = width >= 1024;
  const insets = useSafeAreaInsets();
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    groups.forEach(group => {
      const hasActiveItem = group.items.some(item => item.screen === currentScreen);
      if (hasActiveItem) {
        initial.add(group.id);
      }
    });
    if (initial.size === 0 && groups.length > 0) {
      initial.add(groups[0].id);
    }
    return initial;
  });

  useEffect(() => {
    groups.forEach(group => {
      const hasActiveItem = group.items.some(item => item.screen === currentScreen);
      if (hasActiveItem && !expandedGroups.has(group.id)) {
        setExpandedGroups(prev => new Set(prev).add(group.id));
      }
    });
  }, [currentScreen, groups]);

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        if (!isLargeScreen) {
          next.clear();
        }
        next.add(groupId);
      }
      return next;
    });
  };

  const getBadgeCount = (badgeKey?: string): number | undefined => {
    if (!badgeKey) return undefined;
    if (badgeKey === 'pendingApprovals') return pendingApprovalsCount;
    if (badgeKey === 'todaysVisitors') return todaysVisitorsCount;
    return undefined;
  };

  const handleItemPress = (screen?: string, params?: Record<string, unknown>) => {
    onNavigate(screen || 'Dashboard', params);
    if (!isLargeScreen) {
      setTimeout(() => {
        onClose();
      }, 100);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const isActive = currentScreen === item.screen;
    
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.menuItem,
          isActive && [styles.menuItemActive, { backgroundColor: theme.sidebarActive }],
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => handleItemPress(item.screen, item.params)}
      >
        <DirectionalRow gap={Spacing.md}>
          <DDIcon
            name={item.icon}
            size={18}
            color={isActive ? theme.primary : theme.sidebarTextMuted}
            directionAware={item.icon === 'log-in' || item.icon === 'log-out'}
          />
          <ThemedText
            style={[
              styles.menuText,
              isActive && { color: theme.primary, fontWeight: '600' },
              !isActive && { color: theme.sidebarText },
            ]}
          >
            {t(item.labelKey)}
          </ThemedText>
        </DirectionalRow>
      </Pressable>
    );
  };

  const renderStandaloneItem = (item: MenuItem) => {
    const isActive = currentScreen === item.screen;
    
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.standaloneItem,
          isActive && [styles.menuItemActive, { backgroundColor: theme.sidebarActive }],
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => handleItemPress(item.screen, item.params)}
      >
        <DirectionalRow gap={Spacing.md}>
          <DDIcon
            name={item.icon}
            size={20}
            color={isActive ? theme.primary : theme.sidebarTextMuted}
          />
          <ThemedText
            style={[
              styles.standaloneText,
              isActive && { color: theme.primary, fontWeight: '600' },
              !isActive && { color: theme.sidebarText },
            ]}
          >
            {t(item.labelKey)}
          </ThemedText>
        </DirectionalRow>
      </Pressable>
    );
  };

  const notificationsItem: MenuItem = { 
    id: 'notifications', 
    labelKey: 'navigation.notifications', 
    icon: 'bell', 
    screen: 'Notifications' 
  };
  
  const settingsItem: MenuItem = { 
    id: 'settings', 
    labelKey: 'navigation.settings', 
    icon: 'settings', 
    screen: 'Settings' 
  };

  return (
    <ThemedView 
      key={layoutKey}
      style={[
        styles.sidebar, 
        { 
          backgroundColor: theme.sidebarBg, 
          borderRightColor: theme.border,
          borderLeftColor: theme.border,
          borderRightWidth: isRTL ? 0 : 1,
          borderLeftWidth: isRTL ? 1 : 0,
          paddingTop: insets.top + Spacing.sm,
        },
      ]}
    >
      <Pressable 
        style={({ pressed }) => [styles.profileHeader, pressed && { opacity: 0.7 }]}
        onPress={() => handleItemPress('Dashboard')}
      >
        <DirectionalRow style={styles.profileRow} gap={Spacing.md}>
          {userPhotoUrl ? (
            <Image
              source={{ uri: userPhotoUrl }}
              style={styles.profileAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}>
              <ThemedText style={[Typography.title, { color: Colors.light.buttonText, fontWeight: '600', fontSize: 20 }]}>
                {userName.split(' ').map(n => n[0]).join('')}
              </ThemedText>
            </View>
          )}
          <View style={styles.profileInfo}>
            <ThemedText style={[Typography.body, { fontWeight: '600', color: theme.sidebarText }]} numberOfLines={1}>
              {userName}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.sidebarTextMuted, textTransform: 'capitalize' }]}>
              {userRole.replace('_', ' ')}
            </ThemedText>
          </View>
          <DDIcon name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.sidebarTextMuted} />
        </DirectionalRow>
      </Pressable>

      <Spacer height={Spacing.xl} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {standalone.map(renderStandaloneItem)}

        {standalone.length > 0 && groups.length > 0 ? (
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        ) : null}

        {groups.map(group => (
          <SidebarGroup
            key={group.id}
            title={t(group.labelKey)}
            icon={group.icon}
            isExpanded={expandedGroups.has(group.id)}
            onToggle={() => handleGroupToggle(group.id)}
            badge={getBadgeCount(group.badgeKey)}
          >
            {group.items.map(renderMenuItem)}
          </SidebarGroup>
        ))}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {renderStandaloneItem(notificationsItem)}
        {renderStandaloneItem(settingsItem)}
      </ScrollView>

      <DirectionalRow style={styles.appInfo} gap={Spacing.xs}>
        <ThemedText style={[styles.appName, { color: theme.sidebarTextMuted }]}>
          {t('common.brandName')} {t('common.appName')}
        </ThemedText>
        <ThemedText style={[styles.appVersion, { color: theme.sidebarTextMuted }]}>
          v{Constants.expoConfig?.version || '1.0.0'}
        </ThemedText>
      </DirectionalRow>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <DirectionalRow style={styles.footerActions} gap={Spacing.sm}>
          <Pressable 
            onPress={onToggleDarkMode} 
            style={({ pressed }) => [
              styles.footerButton,
              { backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <DDIcon
              name={isDarkMode ? 'sun' : 'moon'}
              size={20}
              color={theme.sidebarTextMuted}
            />
          </Pressable>
          <Pressable 
            onPress={onLogout} 
            style={({ pressed }) => [
              styles.footerButton,
              { backgroundColor: theme.surfaceSecondary, opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <DDIcon
              name="log-out"
              size={20}
              color={theme.error}
              directionAware
            />
          </Pressable>
        </DirectionalRow>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: '100%',
    height: '100%',
    paddingBottom: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'stretch',
    paddingHorizontal: Spacing.lg,
    width: '100%',
  },
  profileRow: {
    flex: 1,
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
  },
  standaloneItem: {
    alignItems: 'stretch',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  standaloneText: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItem: {
    alignItems: 'stretch',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: 'transparent',
  },
  menuText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  footerActions: {
    justifyContent: 'flex-start',
  },
  footerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  appName: {
    fontSize: 12,
    fontWeight: '500',
  },
  appVersion: {
    fontSize: 12,
    marginStart: Spacing.xs,
  },
});
