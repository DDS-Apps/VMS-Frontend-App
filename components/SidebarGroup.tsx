import React from "react";
import { View, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { DDIcon, IconName } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SidebarGroupProps {
  title: string;
  icon: IconName;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

export default function SidebarGroup({
  title,
  icon,
  isExpanded,
  onToggle,
  badge,
  children,
}: SidebarGroupProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  React.useEffect(() => {
    expandProgress.value = withSpring(isExpanded ? 1 : 0, {
      damping: 20,
      stiffness: 200,
      mass: 0.5,
    });
  }, [isExpanded, expandProgress]);

  const chevronStyle = useAnimatedStyle(() => {
    const baseRotation = isRTL ? 180 : 0;
    const expandedRotation = 90;
    return {
      transform: [
        { rotate: `${interpolate(expandProgress.value, [0, 1], [baseRotation, expandedRotation])}deg` },
      ],
    };
  });

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          { 
            backgroundColor: pressed ? theme.sidebarActive : 'transparent',
          },
        ]}
        onPress={handleToggle}
      >
        <View style={[styles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <DDIcon name={icon} size={18} color={theme.sidebarTextMuted} />
          <ThemedText
            style={[
              styles.headerTitle,
              { color: theme.sidebarText },
            ]}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
        </View>
        <View style={[styles.headerRight, isRTL && { flexDirection: 'row-reverse' }]}>
          {badge !== undefined && badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.badgeText}>
                {badge > 99 ? '99+' : badge}
              </ThemedText>
            </View>
          ) : null}
          <Animated.View style={chevronStyle}>
            <DDIcon name="chevron-right" size={16} color={theme.sidebarTextMuted} />
          </Animated.View>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    paddingStart: Spacing.lg,
    paddingTop: Spacing.xs,
  },
});
