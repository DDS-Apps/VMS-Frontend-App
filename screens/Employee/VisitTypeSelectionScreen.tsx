import React, { useState } from "react";
import { View, StyleSheet, LayoutChangeEvent, Platform } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ROUTES } from "@/constants";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { SelectableCard } from "@/components/SelectableCard";
import Spacer from "@/components/Spacer";
import { Spacing, Typography, BrandColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { VisitTypeSelectionScreenProps } from "@/types/employeeNavigation.types";

const isWeb = Platform.OS === 'web';
const CARD_MIN_WIDTH = 140;
const CARD_GAP = Spacing.md;
const WEB_CARD_SIZE = 150;
const WEB_COLUMNS = 5;

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
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [gridWidth, setGridWidth] = useState(0);

  const scrollContentStyle = {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl,
    paddingHorizontal: Spacing.lg,
  };

  const mobileColumns = gridWidth >= CARD_MIN_WIDTH * 3 + CARD_GAP * 2 ? 3 : 2;
  const columns = isWeb ? WEB_COLUMNS : mobileColumns;
  const cardWidth = isWeb ? WEB_CARD_SIZE : (gridWidth > 0 ? (gridWidth - CARD_GAP * (columns - 1)) / columns : CARD_MIN_WIDTH);

  const handleGridLayout = (event: LayoutChangeEvent) => {
    setGridWidth(event.nativeEvent.layout.width);
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
      navigation.navigate(ROUTES.VISITOR_REQUEST_FORM as never, { visitType: visitType.title } as never);
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

      <View onLayout={handleGridLayout} style={styles.gridContainer}>
        <View style={styles.grid}>
          {visitTypes.map((visitType) => (
            <View key={visitType.id} style={[styles.cardWrapper, isWeb ? styles.webCardWrapper : { width: cardWidth }]}>
              <SelectableCard 
                onPress={() => handleTypeSelect(visitType)}
                backgroundColor={BrandColors.brandOrange}
                borderColor={BrandColors.brandOrange}
              >
                <View style={styles.iconContainer}>
                  <DDIcon name={visitType.icon} size={28} color="#FFFFFF" />
                </View>
                <Spacer height={Spacing.xs} />
                <ThemedText style={[Typography.caption, { color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontSize: 11 }]}>
                  {visitType.title}
                </ThemedText>
              </SelectableCard>
            </View>
          ))}
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  gridContainer: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: isWeb ? 0 : -CARD_GAP / 2,
    gap: isWeb ? CARD_GAP : undefined,
  },
  cardWrapper: {
    paddingHorizontal: isWeb ? 0 : CARD_GAP / 2,
    marginBottom: isWeb ? 0 : CARD_GAP,
  },
  webCardWrapper: {
    width: WEB_CARD_SIZE,
    height: WEB_CARD_SIZE,
  },
  iconContainer: {
    marginBottom: Spacing.xs,
  },
});
