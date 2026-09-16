import React from "react";
import { View, StyleSheet, Pressable, RefreshControl } from "react-native";
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
import { applyOpacity, getStatusIcon } from "@/utils/statusStyles";
import { StatusIcon } from "@/components/shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyValetRequestDetailQuery } from "@/hooks/queries/useValetSelfServiceQueries";
import type { ValetRequestDetailsScreenProps } from "@/types/employeeNavigation.types";
import type { Theme } from "@/types/theme.types";
import type { SelfValetRequestDto } from "@/types/api.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";

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
        <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{label}</ThemedText>
        <ThemedText style={[Typography.body, { color: theme.text }]}>{value}</ThemedText>
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

  if (isLoading && !request) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
        <SkeletonList count={3} />
      </View>
    );
  }

  if (!request) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.errorContainer, { paddingTop: insets.top + Spacing.xl }]}>
          <DDIcon name="alert-triangle" size={48} variant="muted" />
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {isError ? t('common.loadError') : 'Request not found'}
          </ThemedText>
          {isError ? (
            <>
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
            </>
          ) : null}
        </View>
      </ThemedView>
    );
  }

  const parkingDecision = resolveParkingDisplayDecision({
    parkingDecision: (request as any).parkingDecision,
    visitorNeedsParking: (request as any).visitorNeedsParking,
    isVisitorNeedsParking: (request as any).isVisitorNeedsParking,
    hasParkingAllocation: true,
  });
  const status = request.valet?.status || 'pending';
  const statusColor = getStatusColor(status, theme);
  const statusLabel = getStatusLabel(status);

  const formatDate = (dateString: string) => fmtDateLong(new Date(dateString), 'long');
  const formatTime = (dateString: string) => formatTimeUtil(new Date(dateString));

  return (
    <ThemedView style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={scrollContentStyle}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
        }
      >
        {isError && !isRefetching ? (
          <>
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
            <Spacer height={Spacing.md} />
          </>
        ) : null}

        <Card style={styles.headerCard}>
            <DirectionalRow style={styles.statusContainer}>
              <StatusIcon icon={getStatusIcon(status)} color={statusColor} />
              <ThemedText style={[Typography.bodySmall, { color: statusColor, fontWeight: '600', marginStart: Spacing.sm }]}>
                {statusLabel}
              </ThemedText>
          </DirectionalRow>
            <Spacer height={Spacing.lg} />
            <DirectionalRow style={styles.vehicleInfo}>
              <DDIcon name={parkingDecision === 'required' ? "map-pin" : "slash"} size={24} color={theme.primary} />
              <ThemedText style={[Typography.h3, { color: theme.text, marginStart: Spacing.md }]}>
                {parkingDecision === 'required' ? t('parking.needsParking') : t('parking.noParking')}
              </ThemedText>
            </DirectionalRow>
        </Card>

          <Spacer height={Spacing.lg} />

          <ThemedText style={[Typography.h3, { color: theme.text, marginBottom: Spacing.md }]}>
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

          {request.valet?.pickupTime || request.valet?.returnTime ? (
            <>
              <Spacer height={Spacing.lg} />
              <ThemedText style={[Typography.h3, { color: theme.text, marginBottom: Spacing.md }]}>
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
  headerCard: {
    padding: Spacing.lg,
  },
  statusContainer: {
    alignItems: 'flex-start',
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
