import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { SelectableCard, getGridStyle, getCardWrapper3ColStyle } from "@/components/SelectableCard";
import Spacer from "@/components/Spacer";
import { Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { VisitTypeSelectionScreenProps } from "@/types/employeeNavigation.types";

type VisitType = {
  id: string;
  title: string;
  icon: IconName;
};

const VISIT_TYPE_KEYS = [
  { id: 'interview', titleKey: 'visitor.interview', icon: 'user-check' as IconName },
  { id: 'meeting', titleKey: 'visitor.meeting', icon: 'users' as IconName },
  { id: 'business', titleKey: 'visitor.business', icon: 'briefcase' as IconName },
  { id: 'events', titleKey: 'visitor.events', icon: 'star' as IconName },
  { id: 'vendors', titleKey: 'visitor.vendors', icon: 'shopping-bag' as IconName },
  { id: 'partners', titleKey: 'visitor.partners', icon: 'users' as IconName },
  { id: 'training', titleKey: 'visitor.training', icon: 'book-open' as IconName },
  { id: 'maintenance', titleKey: 'visitor.maintenance', icon: 'tool' as IconName },
  { id: 'personal', titleKey: 'visitor.personalVisit', icon: 'user' as IconName },
  { id: 'other', titleKey: 'visitor.other', icon: 'more-horizontal' as IconName },
];

interface VisitTypeSelectionScreenPropsExtended extends VisitTypeSelectionScreenProps {
  onTypeSelect?: (visitType: string) => void;
}

export default function VisitTypeSelectionScreen({ navigation, onTypeSelect }: VisitTypeSelectionScreenPropsExtended) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const scrollContentStyle = {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const visitTypes: VisitType[] = VISIT_TYPE_KEYS.map(item => ({
    id: item.id,
    title: t(item.titleKey),
    icon: item.icon,
  }));

  const handleTypeSelect = (visitType: VisitType) => {
    if (onTypeSelect) {
      onTypeSelect(visitType.title);
    } else {
      navigation.navigate('VisitorRequestForm', { visitType: visitType.title });
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <View style={styles.header}>
        <ThemedText style={[Typography.title, { fontSize: 20, marginBottom: Spacing.xs, textAlign: 'center' }]}>
          {t('visitor.typeOfVisit')}
        </ThemedText>
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('visitor.selectPurpose')}
        </ThemedText>
      </View>

      <Spacer height={Spacing.xl} />

      <View style={getGridStyle()}>
        {visitTypes.map((visitType) => (
          <View key={visitType.id} style={getCardWrapper3ColStyle()}>
            <SelectableCard onPress={() => handleTypeSelect(visitType)}>
              <View style={styles.iconContainer}>
                <DDIcon name={visitType.icon} size={28} color={theme.cardIcon} />
              </View>
              <Spacer height={Spacing.xs} />
              <ThemedText style={[Typography.caption, { color: theme.text, fontWeight: '600', textAlign: 'center', fontSize: 11 }]}>
                {visitType.title}
              </ThemedText>
            </SelectableCard>
          </View>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.xs,
  },
});
