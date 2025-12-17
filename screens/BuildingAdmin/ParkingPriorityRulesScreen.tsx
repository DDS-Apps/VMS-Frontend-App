import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Switch, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { DDIcon, IconName } from '@/components/DDIcon';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { applyOpacity } from '@/utils/statusStyles';
import {
  getPriorityRules,
  updatePriorityRule,
  reorderPriorityRules,
  getParkingConfig,
  updateParkingConfig,
  ParkingPriorityRule,
  ParkingLocationId,
  getLocationLabel,
} from '@/services/mock/parkingManagementState';

const getLocationIcon = (location: ParkingLocationId): IconName => {
  switch (location) {
    case 'skbc_basement': return 'home';
    case 'red_sea_mall': return 'shopping-bag';
    case 'valet_zone': return 'navigation';
    case 'none': return 'x-circle';
    default: return 'map-pin';
  }
};

const getLocationColor = (location: ParkingLocationId, theme: any): string => {
  switch (location) {
    case 'skbc_basement': return theme.primary;
    case 'red_sea_mall': return theme.chartPurple;
    case 'valet_zone': return theme.success;
    case 'none': return theme.textSecondary;
    default: return theme.textSecondary;
  }
};

interface PriorityRuleCardProps {
  rule: ParkingPriorityRule;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onUpdateThreshold: (value: number) => void;
}

function PriorityRuleCard({
  rule,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onUpdateThreshold,
}: PriorityRuleCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [thresholdInput, setThresholdInput] = useState(String(rule.maxOccupancyPercent));
  
  const locationColor = getLocationColor(rule.location, theme);
  const locationIcon = getLocationIcon(rule.location);
  
  const handleThresholdChange = (text: string) => {
    setThresholdInput(text);
  };
  
  const handleThresholdBlur = () => {
    const value = parseInt(thresholdInput, 10);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onUpdateThreshold(value);
    } else {
      setThresholdInput(String(rule.maxOccupancyPercent));
    }
  };

  return (
    <ThemedView 
      style={[
        styles.ruleCard, 
        { 
          backgroundColor: theme.surface,
          borderStartColor: rule.isActive ? locationColor : theme.textSecondary,
          opacity: rule.isActive ? 1 : 0.7,
        }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: applyOpacity(locationColor, '15') }]}>
          <ThemedText style={[styles.priorityNumber, { color: locationColor }]}>
            {rule.priority}
          </ThemedText>
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={[styles.locationIcon, { backgroundColor: applyOpacity(locationColor, '12') }]}>
              <DDIcon name={locationIcon} size={18} color={locationColor} />
            </View>
            <ThemedText style={[styles.locationName, { color: theme.text }]}>
              {getLocationLabel(rule.location)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {rule.description}
          </ThemedText>
        </View>
        
        <View style={styles.reorderButtons}>
          <Pressable
            style={[
              styles.arrowButton,
              { 
                backgroundColor: isFirst ? theme.surfaceSecondary : applyOpacity(theme.primary, '12'),
                opacity: isFirst ? 0.5 : 1,
              }
            ]}
            onPress={onMoveUp}
            disabled={isFirst}
          >
            <DDIcon 
              name="chevron-up" 
              size={18} 
              color={isFirst ? theme.textSecondary : theme.primary} 
            />
          </Pressable>
          <Pressable
            style={[
              styles.arrowButton,
              { 
                backgroundColor: isLast ? theme.surfaceSecondary : applyOpacity(theme.primary, '12'),
                opacity: isLast ? 0.5 : 1,
              }
            ]}
            onPress={onMoveDown}
            disabled={isLast}
          >
            <DDIcon 
              name="chevron-down" 
              size={18} 
              color={isLast ? theme.textSecondary : theme.primary} 
            />
          </Pressable>
        </View>
      </View>
      
      <Spacer height={Spacing.lg} />
      
      <View style={styles.thresholdSection}>
        <View style={styles.thresholdLabel}>
          <DDIcon name="bar-chart-2" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.thresholdLabelText, { color: theme.textSecondary }]}>
            {t('parking.maxOccupancy')}
          </ThemedText>
        </View>
        
        <View style={styles.thresholdInputContainer}>
          <TextInput
            style={[
              styles.thresholdInput,
              { 
                backgroundColor: theme.surfaceSecondary,
                color: theme.text,
                borderColor: theme.border,
              }
            ]}
            value={thresholdInput}
            onChangeText={handleThresholdChange}
            onBlur={handleThresholdBlur}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
          />
          <ThemedText style={[styles.percentSign, { color: theme.textSecondary }]}>
            %
          </ThemedText>
        </View>
      </View>
      
      <View style={[styles.progressBarContainer, { backgroundColor: theme.surfaceSecondary }]}>
        <View 
          style={[
            styles.progressBar, 
            { 
              backgroundColor: locationColor,
              width: `${rule.maxOccupancyPercent}%`,
            }
          ]} 
        />
      </View>
      
      <Spacer height={Spacing.lg} />
      
      <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
        <View style={styles.toggleContainer}>
          <ThemedText style={[styles.toggleLabel, { color: theme.textSecondary }]}>
            {rule.isActive ? t('common.active') : t('common.inactive')}
          </ThemedText>
          <Switch
            value={rule.isActive}
            onValueChange={onToggleActive}
            trackColor={{ false: theme.border, true: applyOpacity(theme.success, '40') }}
            thumbColor={rule.isActive ? theme.success : theme.textSecondary}
            ios_backgroundColor={theme.border}
          />
        </View>
      </View>
    </ThemedView>
  );
}

export default function ParkingPriorityRulesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [rules, setRules] = useState<ParkingPriorityRule[]>([]);
  const [autoAllocationEnabled, setAutoAllocationEnabled] = useState(true);

  const refreshState = useCallback(() => {
    const priorityRules = getPriorityRules();
    setRules(priorityRules);
    
    const config = getParkingConfig();
    setAutoAllocationEnabled(config.enableAutoAllocation);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState])
  );

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newRules = [...rules];
    const orderedIds = newRules.map(r => r.id);
    [orderedIds[index - 1], orderedIds[index]] = [orderedIds[index], orderedIds[index - 1]];
    
    const updatedRules = reorderPriorityRules(orderedIds);
    setRules(updatedRules);
  };

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return;
    
    const newRules = [...rules];
    const orderedIds = newRules.map(r => r.id);
    [orderedIds[index], orderedIds[index + 1]] = [orderedIds[index + 1], orderedIds[index]];
    
    const updatedRules = reorderPriorityRules(orderedIds);
    setRules(updatedRules);
  };

  const handleToggleActive = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      updatePriorityRule(ruleId, { isActive: !rule.isActive });
      refreshState();
    }
  };

  const handleUpdateThreshold = (ruleId: string, value: number) => {
    updatePriorityRule(ruleId, { maxOccupancyPercent: value });
    refreshState();
  };

  const handleToggleAutoAllocation = () => {
    const newValue = !autoAllocationEnabled;
    updateParkingConfig({ enableAutoAllocation: newValue });
    setAutoAllocationEnabled(newValue);
    
    Alert.alert(
      t('common.success'),
      newValue 
        ? t('parking.autoAllocationEnabled') 
        : t('parking.autoAllocationDisabled')
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <ThemedText style={Typography.title}>{t('parking.priorityRules')}</ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {t('parking.priorityRulesSubtitle')}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <View style={styles.sectionHeader}>
        <DDIcon name="list" size={20} color={theme.primary} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('parking.priorityOrder')}
        </ThemedText>
      </View>
      
      <ThemedText style={[styles.sectionDescription, { color: theme.textSecondary }]}>
        {t('parking.priorityOrderDescription')}
      </ThemedText>

      <Spacer height={Spacing.lg} />

      {rules.length > 0 ? (
        <View style={styles.rulesList}>
          {rules.map((rule, index) => (
            <View key={rule.id}>
              <PriorityRuleCard
                rule={rule}
                isFirst={index === 0}
                isLast={index === rules.length - 1}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onToggleActive={() => handleToggleActive(rule.id)}
                onUpdateThreshold={(value) => handleUpdateThreshold(rule.id, value)}
              />
              {index < rules.length - 1 ? <Spacer height={Spacing.md} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
          <DDIcon name="alert-circle" size={32} variant="muted" />
          <Spacer height={Spacing.sm} />
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
            {t('common.noData')}
          </ThemedText>
        </ThemedView>
      )}

      <Spacer height={Spacing.xxl} />

      <View style={styles.sectionHeader}>
        <DDIcon name="settings" size={20} color={theme.primary} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('parking.generalConfiguration')}
        </ThemedText>
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedView style={[styles.configCard, { backgroundColor: theme.surface }]}>
        <View style={styles.configRow}>
          <View style={styles.configInfo}>
            <View style={[styles.configIcon, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
              <DDIcon name="zap" size={20} color={theme.primary} />
            </View>
            <View style={styles.configText}>
              <ThemedText style={[styles.configTitle, { color: theme.text }]}>
                {t('parking.autoAllocation')}
              </ThemedText>
              <ThemedText style={[styles.configDescription, { color: theme.textSecondary }]}>
                {t('parking.autoAllocationDescription')}
              </ThemedText>
            </View>
          </View>
          <Switch
            value={autoAllocationEnabled}
            onValueChange={handleToggleAutoAllocation}
            trackColor={{ false: theme.border, true: applyOpacity(theme.success, '40') }}
            thumbColor={autoAllocationEnabled ? theme.success : theme.textSecondary}
            ios_backgroundColor={theme.border}
          />
        </View>
      </ThemedView>

      <Spacer height={Spacing.xl} />

      <ThemedView style={[styles.infoCard, { backgroundColor: applyOpacity(theme.info, '08'), borderColor: applyOpacity(theme.info, '20') }]}>
        <DDIcon name="info" size={18} color={theme.info} />
        <ThemedText style={[styles.infoText, { color: theme.info }]}>
          {t('parking.priorityRulesInfo')}
        </ThemedText>
      </ThemedView>

      <Spacer height={Spacing.xxl} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  rulesList: {},
  ruleCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderStartWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  priorityBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  reorderButtons: {
    gap: Spacing.xs,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thresholdSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  thresholdLabelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  thresholdInput: {
    width: 60,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  percentSign: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginEnd: Spacing.md,
  },
  configIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configText: {
    flex: 1,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  configDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
