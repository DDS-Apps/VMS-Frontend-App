import React from "react";
import { View, StyleSheet, RefreshControl } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
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
import { DDIcon } from "@/components/DDIcon";
import { DirectionalRow } from "@/components/DirectionalRow";
import { applyOpacity } from "@/utils/statusStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyValetRequestDetailQuery } from "@/hooks/queries/useValetSelfServiceQueries";
import type { ValetRequestDetailsScreenProps } from "@/types/employeeNavigation.types";
import type { Theme } from "@/types/theme.types";
import type { SelfValetRequestDto } from "@/types/api.types";

function getStatusColor(status: string, theme: Theme) {
  switch (status) {
    case 'pending':
      return theme.primary;
    case 'assigned':
      return theme.warning;
    case 'in_progress':
      return theme.info;
    case 'completed':
      return theme.success;
    case 'cancelled':
      return theme.error;
    default:
      return theme.textSecondary;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'assigned':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

const InfoRow = ({ icon, label, value, theme, isRTL }: { icon: string; label: string; value: string; theme: Theme; isRTL: boolean }) => {
  return (
    <DirectionalRow style={styles.infoRow}>
      <View style={[styles.infoIconContainer, { backgroundColor: applyOpacity(theme.primary, '10') }]}>
        <DDIcon name={icon as any} size={16} color={theme.primary} />
      </View>
      <View style={styles.infoContent}>
        <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{label}</ThemedText>
        <ThemedText style={[Typography.body, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>{value}</ThemedText>
      </View>
    </DirectionalRow>
  );
};

export default function ValetRequestDetailsScreen({ route }: ValetRequestDetailsScreenProps) {
  const { requestId } = route.params;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { formatTime: formatTimeUtil, formatDate: fmtDateLong } = useFormatters();
  const insets = useSafeAreaInsets();
  const { data: response, isLoading, isError, refetch, isRefetching } = useMyValetRequestDetailQuery(requestId);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={3} />
      </View>
    );
  }

  // Extract request from response - handle various API response formats
  // The httpClient.get() returns response.data, and the API wraps everything in { success, message, data: {...} }
  // So we might receive { data: SelfValetRequestDto } or directly SelfValetRequestDto
  const request: SelfValetRequestDto | null = React.useMemo(() => {
    if (!response) return null;
    
    // Case 1: Direct DTO (has 'id' and 'vehicleInfo')
    if ('id' in response && 'vehicleInfo' in response) {
      return response as SelfValetRequestDto;
    }
    
    // Case 2: Wrapped in { data: DTO }
    if ('data' in response && (response as any).data) {
      const innerData = (response as any).data;
      // Case 2a: Double wrapped { data: { data: DTO } }
      if ('data' in innerData && innerData.data) {
        return innerData.data as SelfValetRequestDto;
      }
      // Case 2b: Single wrapped { data: DTO }
      if ('id' in innerData) {
        return innerData as SelfValetRequestDto;
      }
    }
    
    return null;
  }, [response]);

  if (isError || (!isLoading && !request)) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <DDIcon name="alert-triangle" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {isError ? t('common.loadError') : 'Request not found'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }
  
  if (!request) {
    return null;
  }

  const status = request.valet?.status || 'pending';
  const statusColor = getStatusColor(status, theme);
  const statusLabel = getStatusLabel(status);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return fmtDateLong(d, 'long');
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return formatTimeUtil(d);
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        <Card style={styles.headerCard}>
          <View style={[styles.statusContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <DirectionalRow style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '15'), borderColor: applyOpacity(statusColor, '30') }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText style={[Typography.bodySmall, { color: statusColor, fontWeight: '600' }]}>
                {statusLabel}
              </ThemedText>
            </DirectionalRow>
          </View>
          
          <Spacer height={Spacing.lg} />
          
          <DirectionalRow style={styles.vehicleInfo}>
            <DDIcon name="truck" size={24} color={theme.primary} />
            <View style={styles.vehicleDetails}>
              <ThemedText style={[Typography.h3, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.vehicleInfo?.make} {request.vehicleInfo?.model}
              </ThemedText>
              <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.vehicleInfo?.plateNumber} - {request.vehicleInfo?.color}
              </ThemedText>
            </View>
          </DirectionalRow>
        </Card>

        <Spacer height={Spacing.lg} />

        <ThemedText style={[Typography.h3, { color: theme.text, marginBottom: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>
          Request Details
        </ThemedText>

        <Card style={styles.detailsCard}>
          <InfoRow 
            icon="map-pin" 
            label="Drop-off Location" 
            value={request.dropOffLocation} 
            theme={theme}
            isRTL={isRTL}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="clock" 
            label="Requested Return Time" 
            value={request.requestedReturnTime} 
            theme={theme}
            isRTL={isRTL}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <InfoRow 
            icon="calendar" 
            label="Created" 
            value={`${formatDate(request.createdAt)} at ${formatTime(request.createdAt)}`} 
            theme={theme}
            isRTL={isRTL}
          />
          {request.notes ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <InfoRow 
                icon="file-text" 
                label="Notes" 
                value={request.notes} 
                theme={theme}
                isRTL={isRTL}
              />
            </>
          ) : null}
        </Card>

        {request.valet?.driver ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.h3, { color: theme.text, marginBottom: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>
              Assigned Driver
            </ThemedText>
            <Card style={styles.driverCard}>
              <DirectionalRow style={styles.driverInfo}>
                <View style={[styles.driverAvatar, { backgroundColor: applyOpacity(theme.success, '15') }]}>
                  <DDIcon name="user" size={20} color={theme.success} />
                </View>
                <View style={styles.driverDetails}>
                  <ThemedText style={[Typography.body, { color: theme.text, fontWeight: '600', textAlign: isRTL ? 'right' : 'left' }]}>
                    {request.valet.driver.name}
                  </ThemedText>
                  {request.valet.driver.phone ? (
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {request.valet.driver.phone}
                    </ThemedText>
                  ) : null}
                </View>
              </DirectionalRow>
            </Card>
          </>
        ) : null}

        {request.valet?.pickupTime || request.valet?.returnTime ? (
          <>
            <Spacer height={Spacing.lg} />
            <ThemedText style={[Typography.h3, { color: theme.text, marginBottom: Spacing.md, textAlign: isRTL ? 'right' : 'left' }]}>
              Timeline
            </ThemedText>
            <Card style={styles.timelineCard}>
              {request.valet.pickupTime ? (
                <InfoRow 
                  icon="log-in" 
                  label="Pickup Time" 
                  value={request.valet.pickupTime} 
                  theme={theme}
                  isRTL={isRTL}
                />
              ) : null}
              {request.valet.pickupTime && request.valet.returnTime ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
              {request.valet.returnTime ? (
                <InfoRow 
                  icon="log-out" 
                  label="Return Time" 
                  value={request.valet.returnTime} 
                  theme={theme}
                  isRTL={isRTL}
                />
              ) : null}
            </Card>
          </>
        ) : null}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.lg,
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginEnd: Spacing.sm,
  },
  vehicleInfo: {
    alignItems: 'center',
  },
  vehicleDetails: {
    marginStart: Spacing.md,
    flex: 1,
  },
  detailsCard: {
    padding: Spacing.lg,
  },
  infoRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    marginStart: Spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  driverCard: {
    padding: Spacing.lg,
  },
  driverInfo: {
    alignItems: 'center',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    marginStart: Spacing.md,
    flex: 1,
  },
  timelineCard: {
    padding: Spacing.lg,
  },
});
