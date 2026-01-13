import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  viewAllText?: string;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
  titleSize?: 'small' | 'medium' | 'large';
  icon?: IconName;
}

export function SectionHeader({
  title,
  subtitle,
  onViewAll,
  viewAllText,
  rightContent,
  style,
  titleSize = 'medium',
  icon,
}: SectionHeaderProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();

  const getTitleStyle = () => {
    switch (titleSize) {
      case 'small':
        return { fontSize: 14, fontWeight: '600' as const };
      case 'large':
        return { fontSize: 18, fontWeight: '700' as const };
      default:
        return { fontSize: 16, fontWeight: '600' as const };
    }
  };

  const renderTitleSection = () => {
    return (
      <View style={[styles.titleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        {icon ? (
          <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <DDIcon name={icon} size={titleSize === 'large' ? 20 : 18} color={theme.primary} />
            <ThemedText 
              style={[Typography.subtitle, getTitleStyle(), { marginStart: Spacing.sm }]}
              align="start"
            >
              {title}
            </ThemedText>
          </View>
        ) : (
          <ThemedText 
            style={[Typography.subtitle, getTitleStyle()]}
            align="start"
          >
            {title}
          </ThemedText>
        )}
        {subtitle ? (
          <ThemedText 
            style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}
            align="start"
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    );
  };

  const renderViewAllButton = () => {
    if (!onViewAll || !viewAllText) return null;

    return (
      <Pressable 
        onPress={onViewAll} 
        style={[styles.viewAllButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <ThemedText style={[Typography.body, { color: theme.primary, fontWeight: '500' }]}>
          {viewAllText}
        </ThemedText>
        <DDIcon 
          name="chevron-right" 
          size={16} 
          color={theme.primary}
          directionAware
        />
      </Pressable>
    );
  };

  const titleSection = renderTitleSection();
  const rightSection = rightContent ? (
    <View style={styles.rightContainer}>
      {rightContent}
    </View>
  ) : null;
  const viewAllButton = renderViewAllButton();

  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      {titleSection}
      {rightSection}
      {viewAllButton}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rightContainer: {
    marginStart: Spacing.md,
  },
  viewAllButton: {
    alignItems: 'center',
    gap: 2,
  },
});

export default SectionHeader;
