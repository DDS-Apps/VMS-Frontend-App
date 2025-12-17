import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { DDIcon, IconName } from "@/components/DDIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { applyOpacity } from "@/utils/statusStyles";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  compact?: boolean;
}

export const EmptyState = ({ 
  icon = 'inbox', 
  title, 
  message,
  compact = false 
}: EmptyStateProps) => {
  const { theme } = useTheme();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: applyOpacity(theme.textSecondary, '05'),
        padding: compact ? Spacing.lg : Spacing.xxl,
      }
    ]}>
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: applyOpacity(theme.textSecondary, '10'),
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: compact ? 24 : 32,
        }
      ]}>
        <DDIcon 
          name={icon} 
          size={compact ? 24 : 32} 
          color={theme.textSecondary} 
        />
      </View>
      <ThemedText style={[
        styles.title, 
        { 
          color: theme.text,
          fontSize: compact ? 15 : 17,
          marginTop: compact ? Spacing.md : Spacing.lg,
        }
      ]}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText style={[
          styles.message, 
          { 
            color: theme.textSecondary,
            fontSize: compact ? 13 : 14,
          }
        ]}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
});
