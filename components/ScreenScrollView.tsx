import { ScrollView, ScrollViewProps, StyleSheet, Platform } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing } from "@/constants/theme";

interface ScreenScrollViewProps extends ScrollViewProps {
  skipTopPadding?: boolean;
}

export function ScreenScrollView({
  children,
  contentContainerStyle,
  style,
  nestedScrollEnabled,
  skipTopPadding = false,
  ...scrollViewProps
}: ScreenScrollViewProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, direction: isRTL ? 'rtl' : 'ltr' },
        style,
      ]}
      contentContainerStyle={[
        {
          paddingTop: skipTopPadding ? Spacing.md : paddingTop,
          paddingBottom,
        },
        styles.contentContainer,
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
      nestedScrollEnabled={nestedScrollEnabled ?? true}
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
});
