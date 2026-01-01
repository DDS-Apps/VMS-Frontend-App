import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { DDIcon } from "@/components/DDIcon";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { applyOpacity } from "@/utils/statusStyles";
import type { CheckInOutConfirmationScreenProps } from "@/types/receptionistNavigation.types";

export default function CheckInOutConfirmationScreen({ 
  route, 
  navigation 
}: CheckInOutConfirmationScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const action = route.params?.action || 'check_in';
  const visitorName = route.params?.visitorName || 'Visitor';
  const time = route.params?.time || '';

  const isCheckIn = action === 'check_in';
  const accentColor = isCheckIn ? theme.success : theme.primary;
  const iconName = isCheckIn ? 'log-in' : 'log-out';

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.goBack();
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const backgroundColor = isCheckIn 
    ? applyOpacity(theme.success, '10') 
    : applyOpacity(theme.primary, '10');

  return (
    <ThemedView style={[styles.container, { 
      paddingTop: insets.top + Spacing.xl,
      paddingBottom: insets.bottom + Spacing.xl,
      backgroundColor: backgroundColor
    }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: applyOpacity(accentColor, '15') }]}>
          <View style={[styles.iconInnerCircle, { backgroundColor: applyOpacity(accentColor, '25') }]}>
            <DDIcon name={iconName} size={64} color={accentColor} />
          </View>
        </View>

        <Spacer height={Spacing.xxl} />

        <ThemedText style={[styles.title, { color: theme.text }]}>
          {isCheckIn ? t('security.checkInSuccess') : t('security.checkOutSuccess')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <ThemedText style={[styles.message, { color: theme.textSecondary }]}>
          {visitorName} {isCheckIn ? t('notifications.visitorCheckedIn').toLowerCase() : t('notifications.visitorCheckedOut').toLowerCase()} {time}.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
