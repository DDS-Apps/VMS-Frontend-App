import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonList } from "@/components/shared/Skeleton";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon } from "@/components/DDIcon";
import { applyOpacity } from "@/utils/statusStyles";
import { useTodayVisitorsQuery } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto } from "@/types";
import { DirectionalRow } from '@/components/DirectionalRow';

export default function UpcomingVisitorsListScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((visitorId: string) => {
    setExpandedVisitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitorId)) {
        newSet.delete(visitorId);
      } else {
        newSet.add(visitorId);
      }
      return newSet;
    });
  }, []);

  const { data: todayResponse, isLoading, isFetching, isError, error } = useTodayVisitorsQuery();

  const scrollContentStyle = {
    paddingHorizontal: Spacing.xl,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl
  };

  const todaysVisitors = todayResponse?.data ?? [];

  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && error && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), error?.message || t('common.loadError'));
    }
    if (!isError) {
      hasShownError.current = false;
    }
  }, [isError, error, t]);

  const upcomingVisitors = useMemo(() => {
    return todaysVisitors.filter(visitor => 
      visitor.status === 'expected' || visitor.status === 'pending'
    );
  }, [todaysVisitors]);

  const filteredVisitors = useMemo(() => {
    return upcomingVisitors.filter(visitor => {
      const name = visitor.visitor.fullName.toLowerCase();
      const phone = visitor.visitor.phone ?? '';
      const company = (visitor.visitor.company ?? '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || phone.includes(searchQuery) || company.includes(query);
    });
  }, [upcomingVisitors, searchQuery]);

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl, paddingHorizontal: Spacing.xl }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.xl, paddingHorizontal: Spacing.xl, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
      </View>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('status.completed'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  };

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    return (
      <ThemedView key={item.id} style={[styles.visitorCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.statusBorderLine, { backgroundColor: statusConfig.border }]} />
        
        <View style={styles.cardMainSection}>
          <DirectionalRow style={styles.cardHeaderRow}>
            <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {initials}
              </ThemedText>
            </View>
            
            <View style={styles.cardNameSection}>
              <ThemedText style={[styles.visitorName, { color: theme.text }]}>
                {visitorName}
              </ThemedText>
              <ThemedText style={[styles.companyText, { color: theme.textSecondary }]}>
                {item.visitor.company ?? ''}
              </ThemedText>
            </View>
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          <DirectionalRow style={styles.dateTimeRow}>
            <DDIcon name="clock" size={13} variant="muted" />
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
              {t('reception.hostName')}: {item.hostName}
            </ThemedText>
            <DDIcon name="user" size={13} variant="muted" />
            <ThemedText style={[styles.separator, { color: theme.border }]}>-</ThemedText>
            <ThemedText style={[styles.dateTimeText, { color: theme.textSecondary }]}>
              {formatTimeFromString(item.visitTime)}
            </ThemedText>
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          <DirectionalRow style={styles.bottomRow} justifyContent="space-between">
            <DirectionalRow style={styles.servicesRow}>
              {item.parkingSlot ? (
                <View style={[styles.servicePillRounded, { backgroundColor: applyOpacity(theme.info, '20') }]}>
                  <DDIcon name="map-pin" size={14} color={theme.info} />
                </View>
              ) : null}
              </DirectionalRow>
            <View style={[styles.statusBadgeBottom, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
              <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </ThemedText>
            </View>
          </DirectionalRow>

          {expandedVisitors.has(item.id) && (item.visitor.phone || item.visitor.email) ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={[styles.expandedSection, { backgroundColor: applyOpacity(theme.border, '30') }]}>
                {item.visitor.phone ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="phone" size={14} variant="muted" />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.textSecondary, marginEnd: 8 }]}>
                      {item.visitor.phone}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
                {item.visitor.email ? (
                  <DirectionalRow style={styles.expandedDetailRow}>
                    <DDIcon name="mail" size={14} variant="muted" />
                    <ThemedText style={[styles.expandedDetailText, { color: theme.textSecondary, marginEnd: 8 }]}>
                      {item.visitor.email}
                    </ThemedText>
                  </DirectionalRow>
                ) : null}
              </View>
            </>
          ) : null}

        </View>
      </ThemedView>
    );
  };

  return (
    <ScreenScrollView contentContainerStyle={scrollContentStyle}>
      <ThemedText style={[Typography.title, { fontSize: 24, fontWeight: '700' }]}>
        {t('visitor.upcomingVisitors')}
      </ThemedText>
      
      <Spacer height={Spacing.sm} />
      
      <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
        {filteredVisitors.length} {t('visitor.expectedVisitors').toLowerCase()}
      </ThemedText>

      <Spacer height={Spacing.xl} />

      <SearchInput
        placeholder={t('reception.searchVisitor')}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <Spacer height={Spacing.lg} />

      {filteredVisitors.length > 0 ? (
        filteredVisitors.map((visitor) => (
          <View key={visitor.id}>
            {renderVisitorCard(visitor)}
            <Spacer height={Spacing.md} />
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <DDIcon name="users" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('common.noResults')}
          </ThemedText>
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  visitorCard: {
    borderRadius: 10,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  statusBorderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    borderTopStartRadius: 10,
    borderBottomStartRadius: 10,
  },
  cardMainSection: {
    
  },
  cardHeaderRow: {
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  cardNameSection: {
    flex: 1,
    marginStart: Spacing.md,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  companyText: {
    fontSize: 12,
    marginTop: 2,
  },
  dateTimeRow: {
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
  },
  separator: {
    fontSize: 13,
  },
  bottomRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicesRow: {
    gap: Spacing.sm,
  },
  servicePillRounded: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeBottom: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  expandedSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  expandedDetailRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedDetailText: {
    fontSize: 13,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
