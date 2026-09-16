import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from "@/constants";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { SearchInput } from "@/components/SearchInput";
import { DDIcon } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import Spacer from "@/components/Spacer";
import { SkeletonList } from "@/components/shared/Skeleton";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyValetRequestsQuery } from "@/hooks/queries/useValetSelfServiceQueries";
import { applyOpacity, getStatusConfig } from "@/utils/statusStyles";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { RTLHorizontalScrollView, FilterChip } from "@/components/shared";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import type { MyValetRequestsScreenProps } from "@/types/employeeNavigation.types";
import type { SelfValetRequestDto, SelfValetRequestsResponse } from "@/types/api.types";
import type { Theme } from "@/types/theme.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const StatusAccent = ({ color }: { color: string }) => (
  <View style={[styles.statusAccent, { backgroundColor: color }]} />
);

const ValetRequestCard = React.memo(({ 
  request, 
  theme, 
  onPress,
  formatTime,
  formatDateLocale,
  isRTL
}: { 
  request: SelfValetRequestDto; 
  theme: Theme;
  onPress: () => void;
  formatTime: (date: Date) => string;
  formatDateLocale: (date: Date, format: 'short' | 'medium' | 'long') => string;
  isRTL: boolean;
}) => {
  const { t } = useTranslation();
  const status = request.valet?.status || 'pending';
  const statusConfig = getStatusConfig(theme, status, t);
  const parkingDecision = resolveParkingDisplayDecision({
    parkingDecision: (request as any).parkingDecision,
    visitorNeedsParking: (request as any).visitorNeedsParking,
    isVisitorNeedsParking: (request as any).isVisitorNeedsParking,
    hasParkingAllocation: true,
  });
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return formatDateLocale(d, 'short');
  };

  const formatTimeStr = (dateString: string) => formatTime(new Date(dateString));

  const iconContent = (
    <View style={styles.vehicleIconContainer}>
      <View style={[styles.vehicleIcon, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
        <DDIcon name="truck" size={20} variant="primary" />
      </View>
    </View>
  );
  const parkingIcon = parkingDecision === 'required' ? (
    <View style={[styles.vehicleIcon, { backgroundColor: applyOpacity(theme.info, '15') }]}>
      <DDIcon name="map-pin" size={16} color={theme.info} />
    </View>
  ) : null;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.taskCard}>
        <StatusAccent color={statusConfig.borderColor} />
        <View style={styles.taskCardContent}>
          <DirectionalRow style={styles.taskHeaderRow}>
            {iconContent}
            {parkingIcon}
            <View style={styles.taskHeaderInfo} />
            <RequestStatusBadge status={status} />
          </DirectionalRow>

          <Spacer height={Spacing.md} />

          <DirectionalRow style={styles.taskDetailsRow}>
            <DirectionalRow style={styles.taskDetailItem}>
              <DDIcon name="map-pin" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                {request.dropOffLocation}
              </ThemedText>
            </DirectionalRow>
            <DirectionalRow style={styles.taskDetailItem}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                Return: {request.requestedReturnTime}
              </ThemedText>
            </DirectionalRow>
          </DirectionalRow>

          {request.notes ? (
            <>
              <Spacer height={Spacing.sm} />
              <DirectionalRow style={styles.notesRow}>
                <DDIcon name="file-text" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6, flex: 1 }]} numberOfLines={2}>
                  {request.notes}
                </ThemedText>
              </DirectionalRow>
            </>
          ) : null}

          <Spacer height={Spacing.sm} />
          <DirectionalRow style={styles.taskFooterRow}>
            <DDIcon name="calendar" size={12} variant="muted" />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4, fontSize: 11 }]}>
              {formatDate(request.createdAt)} at {formatTimeStr(request.createdAt)}
            </ThemedText>
          </DirectionalRow>
        </View>
      </Card>
    </Pressable>
  );
});

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function MyValetRequestsScreen({ navigation }: MyValetRequestsScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { formatTime, formatDate: formatDateLocale } = useFormatters();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMyValetRequestsQuery();

  const filteredRequests = useMemo(() => {
    let requests: SelfValetRequestDto[] = [];
    
    if (!response) {
      return [];
    }
    
    if (Array.isArray(response)) {
      requests = response;
    } else if (typeof response === 'object' && 'data' in response) {
      const responseData = (response as SelfValetRequestsResponse).data;
      if (Array.isArray(responseData)) {
        requests = responseData;
      } else if (typeof responseData === 'object' && responseData !== null && 'data' in responseData && Array.isArray((responseData as { data: SelfValetRequestDto[] }).data)) {
        requests = (responseData as { data: SelfValetRequestDto[] }).data;
      }
    }
    
    return requests
      .filter(request => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const status = request.valet?.status || 'pending';
        return [
          request.dropOffLocation,
          request.requestedReturnTime,
          request.createdAt,
          request.notes,
          status,
        ].some(value => value?.toLowerCase().includes(query));
      })
      .filter(request => {
        if (statusFilter === 'all') return true;
        const status = request.valet?.status || 'pending';
        if (statusFilter === 'pending') return status === 'pending' || status === 'assigned';
        return status === statusFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [response, searchQuery, statusFilter]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const handleRequestPress = (requestId: string) => {
    navigation.navigate(ROUTES.VALET_REQUEST_DETAILS as any, { requestId } as any);
  };


  if (isLoading && !response) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError && !response) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={() => refetch()}
        >
          <ThemedText
            style={[
              Typography.bodySmall,
              { color: theme.buttonText, fontWeight: '600' },
            ]}
          >
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        <DirectionalRow style={styles.headerRow}>
          <View>
            <ThemedText style={[Typography.h2, {}]}>{t('navigation.myValetRequests')}</ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {filteredRequests.length} {t('sidebar.requests')}
            </ThemedText>
          </View>
        </DirectionalRow>

        {isError && response && !isRefetching ? (
          <>
            <Spacer height={Spacing.md} />
            <DirectionalRow
              style={[
                styles.inlineErrorState,
                { backgroundColor: applyOpacity(theme.error, '10') },
              ]}
            >
              <DDIcon name="alert-circle" size={16} color={theme.error} />
              <ThemedText
                style={[
                  Typography.caption,
                  { color: theme.error, flex: 1 },
                ]}
              >
                {t('common.loadError')}
              </ThemedText>
              <Pressable onPress={() => refetch()} hitSlop={8}>
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.primary, fontWeight: '600' },
                  ]}
                >
                  {t('common.retry')}
                </ThemedText>
              </Pressable>
            </DirectionalRow>
          </>
        ) : null}

        <Spacer height={Spacing.lg} />

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search location, notes, or time..."
        />

        <Spacer height={Spacing.md} />

        <RTLHorizontalScrollView
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
          nestedScrollEnabled={true}
        >
          {FILTER_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              isSelected={statusFilter === option.key}
              onPress={() => setStatusFilter(option.key)}
            />
          ))}
        </RTLHorizontalScrollView>

        <Spacer height={Spacing.lg} />

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <DDIcon name="truck" size={48} variant="muted" />
            <Spacer height={Spacing.md} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              {searchQuery || statusFilter !== 'all'
                ? t('valet.noMatchingRequests')
                : t('valet.noRequests')}
            </ThemedText>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <React.Fragment key={request.id}>
              <ValetRequestCard
                request={request}
                theme={theme}
                onPress={() => handleRequestPress(request.id)}
                formatTime={formatTime}
                formatDateLocale={formatDateLocale}
                isRTL={isRTL}
              />
              <Spacer height={Spacing.md} />
            </React.Fragment>
          ))
        )}
      </ScreenScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineErrorState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  createButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  filterRow: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyCreateButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  taskCard: {
    overflow: 'hidden',
    flexDirection: 'row' as const,
  },
  statusAccent: {
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  taskCardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  taskHeaderRow: {
    alignItems: 'center',
  },
  vehicleIconContainer: {
    marginEnd: Spacing.sm,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskHeaderInfo: {
    flex: 1,
  },
  taskDetailsRow: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  taskDetailItem: {
    alignItems: 'center',
  },
  driverRow: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  notesRow: {
    alignItems: 'flex-start',
  },
  taskFooterRow: {
    alignItems: 'center',
  },
});
