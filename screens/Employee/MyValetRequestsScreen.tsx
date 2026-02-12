import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, RefreshControl } from "react-native";
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
import { applyOpacity } from "@/utils/statusStyles";
import { DirectionalRow, getFlexDirection } from "@/components/DirectionalRow";
import type { MyValetRequestsScreenProps } from "@/types/employeeNavigation.types";
import type { SelfValetRequestDto, SelfValetRequestsResponse } from "@/types/api.types";
import type { Theme } from "@/types/theme.types";

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const getValetStatusConfig = (theme: Theme, status: string): { 
  bg: string; 
  text: string; 
  border: string; 
  label: string;
  borderColor: string;
} => {
  switch (status) {
    case 'pending':
      return {
        bg: applyOpacity(theme.textSecondary, '15'),
        text: theme.textSecondary,
        border: applyOpacity(theme.textSecondary, '30'),
        borderColor: theme.textSecondary,
        label: 'Pending'
      };
    case 'assigned':
      return {
        bg: applyOpacity(theme.info, '15'),
        text: theme.info,
        border: applyOpacity(theme.info, '30'),
        borderColor: theme.info,
        label: 'Assigned'
      };
    case 'in_progress':
      return {
        bg: applyOpacity(theme.warning, '15'),
        text: theme.warning,
        border: applyOpacity(theme.warning, '30'),
        borderColor: theme.warning,
        label: 'In Progress'
      };
    case 'completed':
      return {
        bg: applyOpacity(theme.success, '15'),
        text: theme.success,
        border: applyOpacity(theme.success, '30'),
        borderColor: theme.success,
        label: 'Completed'
      };
    case 'cancelled':
      return {
        bg: applyOpacity(theme.error, '15'),
        text: theme.error,
        border: applyOpacity(theme.error, '30'),
        borderColor: theme.error,
        label: 'Cancelled'
      };
    default:
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
        border: theme.border,
        borderColor: theme.textSecondary,
        label: status
      };
  }
};

const StatusBadge = ({ status, theme }: { status: string; theme: Theme }) => {
  const statusConfig = getValetStatusConfig(theme, status);
  return (
    <View style={[
      styles.statusBadge,
      { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }
    ]}>
      <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
        {statusConfig.label}
      </ThemedText>
    </View>
  );
};

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
  const status = request.valet?.status || 'pending';
  const statusConfig = getValetStatusConfig(theme, status);  
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return formatDateLocale(d, 'short');
  };

  const formatTimeStr = (dateString: string) => {
    const d = new Date(dateString);
    return formatTime(d);
  };

  const iconContent = (
    <View style={styles.vehicleIconContainer}>
      <View style={[styles.vehicleIcon, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
        <DDIcon name="truck" size={20} variant="primary" />
      </View>
    </View>
  );
  const headerInfo = (
    <View style={styles.taskHeaderInfo}>
      <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
        {request.vehicleInfo.plateNumber}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
        {request.vehicleInfo.make} {request.vehicleInfo.model} - {request.vehicleInfo.color}
      </ThemedText>
    </View>
  );

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.taskCard}>
        <StatusAccent color={statusConfig.borderColor} />
        <View style={styles.taskCardContent}>
          <DirectionalRow style={styles.taskHeaderRow}>
            {iconContent}
            {headerInfo}
            <StatusBadge status={status} theme={theme} />
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

          {request.valet?.driver ? (
            <>
              <Spacer height={Spacing.sm} />
              <DirectionalRow style={[styles.driverRow, { backgroundColor: applyOpacity(theme.success, '08') }]}>
                <DDIcon name="user" size={14} color={theme.success} />
                <ThemedText style={[Typography.caption, { color: theme.success, marginStart: 6, fontWeight: '500' }]}>
                  Driver: {request.valet.driver.name}
                </ThemedText>
              </DirectionalRow>
            </>
          ) : null}

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

  const { data: response, isLoading, isError, error, refetch, isRefetching } = useMyValetRequestsQuery();

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
        const plateNumber = (request.vehicleInfo?.plateNumber || '').toLowerCase();
        const make = (request.vehicleInfo?.make || '').toLowerCase();
        const model = (request.vehicleInfo?.model || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return plateNumber.includes(query) || make.includes(query) || model.includes(query);
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
    navigation.navigate(ROUTES.VALET_REQUEST_DETAILS as never, { requestId } as never);
  };


  if (isLoading || isRefetching) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={5} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
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

        <Spacer height={Spacing.lg} />

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by plate, make, or model..."
        />

        <Spacer height={Spacing.md} />

        <DirectionalRow style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setStatusFilter(option.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === option.key ? theme.primary : theme.surface,
                  borderColor: statusFilter === option.key ? theme.primary : theme.border,
                }
              ]}
            >
              <ThemedText style={[
                Typography.caption,
                {
                  color: statusFilter === option.key ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: statusFilter === option.key ? '600' : '400',
                }
              ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </DirectionalRow>

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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
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
