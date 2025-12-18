import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useMyValetRequestsQuery } from "@/hooks/queries/useValetSelfServiceQueries";
import { applyOpacity } from "@/utils/statusStyles";
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
  onPress
}: { 
  request: SelfValetRequestDto; 
  theme: Theme;
  onPress: () => void;
}) => {
  const status = request.valet?.status || 'pending';
  const statusConfig = getValetStatusConfig(theme, status);
  
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.taskCard}>
        <StatusAccent color={statusConfig.borderColor} />
        <View style={styles.taskCardContent}>
          <View style={styles.taskHeaderRow}>
            <View style={styles.vehicleIconContainer}>
              <View style={[styles.vehicleIcon, { backgroundColor: applyOpacity(theme.primary, '15') }]}>
                <DDIcon name="truck" size={20} variant="primary" />
              </View>
            </View>
            <View style={styles.taskHeaderInfo}>
              <ThemedText style={[Typography.body, { fontWeight: '600' }]}>
                {request.vehicleInfo.plateNumber}
              </ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
                {request.vehicleInfo.make} {request.vehicleInfo.model} - {request.vehicleInfo.color}
              </ThemedText>
            </View>
            <StatusBadge status={status} theme={theme} />
          </View>

          <Spacer height={Spacing.md} />

          <View style={styles.taskDetailsRow}>
            <View style={styles.taskDetailItem}>
              <DDIcon name="map-pin" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                {request.dropOffLocation}
              </ThemedText>
            </View>
            <View style={styles.taskDetailItem}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6 }]}>
                Return: {request.requestedReturnTime}
              </ThemedText>
            </View>
          </View>

          {request.valet?.driver ? (
            <>
              <Spacer height={Spacing.sm} />
              <View style={[styles.driverRow, { backgroundColor: applyOpacity(theme.success, '08') }]}>
                <DDIcon name="user" size={14} color={theme.success} />
                <ThemedText style={[Typography.caption, { color: theme.success, marginStart: 6, fontWeight: '500' }]}>
                  Driver: {request.valet.driver.name}
                </ThemedText>
              </View>
            </>
          ) : null}

          {request.notes ? (
            <>
              <Spacer height={Spacing.sm} />
              <View style={styles.notesRow}>
                <DDIcon name="file-text" size={14} variant="muted" />
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 6, flex: 1 }]} numberOfLines={2}>
                  {request.notes}
                </ThemedText>
              </View>
            </>
          ) : null}

          <Spacer height={Spacing.sm} />
          <View style={styles.taskFooterRow}>
            <DDIcon name="calendar" size={12} variant="muted" />
            <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginStart: 4, fontSize: 11 }]}>
              {formatDate(request.createdAt)} at {formatTime(request.createdAt)}
            </ThemedText>
          </View>
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
    // Safely extract requests array from various possible API response shapes
    let requests: SelfValetRequestDto[] = [];
    
    console.log('[MyValetRequestsScreen] Raw response:', JSON.stringify(response, null, 2));
    
    if (response) {
      if (Array.isArray(response)) {
        requests = response;
        console.log('[MyValetRequestsScreen] Response is array, length:', response.length);
      } else if (typeof response === 'object' && 'data' in response && Array.isArray((response as SelfValetRequestsResponse).data)) {
        requests = (response as SelfValetRequestsResponse).data;
        console.log('[MyValetRequestsScreen] Extracted data array, length:', requests.length);
      } else {
        console.warn('[MyValetRequestsScreen] Unexpected response structure:', JSON.stringify(response));
      }
    }
    
    console.log('[MyValetRequestsScreen] Requests before filter:', requests.length);
    if (requests.length > 0) {
      console.log('[MyValetRequestsScreen] First request sample:', JSON.stringify(requests[0], null, 2));
    }
    
    const filtered = requests
      .filter(request => {
        // Allow all requests through if no search query
        if (!searchQuery.trim()) return true;
        
        // For search, check vehicleInfo fields if available
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
    
    console.log('[MyValetRequestsScreen] Requests after filter:', filtered.length);
    
    return filtered;
  }, [response, searchQuery, statusFilter]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const handleRequestPress = (requestId: string) => {
    navigation.navigate('ValetRequestDetails', { requestId });
  };

  const handleCreateNew = () => {
    navigation.navigate('ParkMyCar');
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
        <View style={styles.headerRow}>
          <View>
            <ThemedText style={[Typography.h2]}>My Valet Requests</ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <Pressable
            style={[styles.createButton, { backgroundColor: theme.primary }]}
            onPress={handleCreateNew}
          >
            <DDIcon name="plus" size={20} color="#FFFFFF" />
            <ThemedText style={[Typography.bodySmall, { color: '#FFFFFF', marginStart: 6, fontWeight: '600' }]}>
              New Request
            </ThemedText>
          </Pressable>
        </View>

        <Spacer height={Spacing.lg} />

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by plate, make, or model..."
        />

        <Spacer height={Spacing.md} />

        <View style={styles.filterRow}>
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
        </View>

        <Spacer height={Spacing.lg} />

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <DDIcon name="truck" size={48} variant="muted" />
            <Spacer height={Spacing.md} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
              {searchQuery || statusFilter !== 'all' 
                ? 'No matching valet requests found'
                : 'No valet requests yet'}
            </ThemedText>
            {!searchQuery && statusFilter === 'all' ? (
              <>
                <Spacer height={Spacing.md} />
                <Pressable
                  style={[styles.emptyCreateButton, { borderColor: theme.primary }]}
                  onPress={handleCreateNew}
                >
                  <ThemedText style={[Typography.body, { color: theme.primary, fontWeight: '600' }]}>
                    Park My Car
                  </ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : (
          filteredRequests.map((request) => (
            <React.Fragment key={request.id}>
              <ValetRequestCard
                request={request}
                theme={theme}
                onPress={() => handleRequestPress(request.id)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
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
    flexDirection: 'row',
    overflow: 'hidden',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  taskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
