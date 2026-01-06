import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from "@/constants";
import type { NavigationProp } from '@react-navigation/native';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyOpacity } from '@/utils/statusStyles';
import { 
  useAllRequestsQuery,
  type UnifiedRequest,
  type UnifiedRequestType,
  type UnifiedStatus,
} from '@/hooks/queries/useAllRequestsQuery';
import { useApproveVisitMutation, useRejectVisitMutation } from '@/hooks/queries/useApprovalQueries';
import { useUpdateBuffetRequestMutation } from '@/hooks/queries/useBuffetQueries';
import { useUpdateValetAssignmentMutation } from '@/hooks/queries/useValetQueries';
import { useValetParkingDashboard } from '@/hooks/queries/useValetAdminQueries';
import { useQueryClient } from '@tanstack/react-query';
import type { ValetParkingVisitorDto } from '@/types/api.types';
import type { Theme } from '@/types/theme.types';
import type { VisitListItemDto, BuffetAdminTaskDto, ValetTaskDto } from '@/types/api.types';
import { BuffetRequestStatus, ValetAssignmentStatus } from '@/types/api.types';

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  contentGap: Spacing.md,
};

type RequestFilter = UnifiedRequestType | 'all';
type StatusFilter = UnifiedStatus | 'all';

const getTypeIcon = (type: UnifiedRequestType): IconName => {
  switch (type) {
    case 'visitor': return 'users';
    case 'buffet': return 'cloche';
    case 'valet': return 'navigation';
    default: return 'layers';
  }
};

const getTypeColor = (type: UnifiedRequestType, theme: Theme) => {
  switch (type) {
    case 'visitor': return theme.primary;
    case 'buffet': return '#FF6B35';
    case 'valet': return '#6366F1';
    default: return theme.textSecondary;
  }
};

const getStatusColor = (status: UnifiedStatus, theme: Theme) => {
  switch (status) {
    case 'approved': return theme.success;
    case 'completed': return theme.success;
    case 'pending': return theme.warning;
    case 'in_progress': return theme.info;
    case 'rejected': return theme.error;
    case 'cancelled': return theme.error;
    default: return theme.textSecondary;
  }
};

const getStatusLabel = (status: UnifiedStatus, t: (key: string) => string) => {
  switch (status) {
    case 'pending': return t('status.pending');
    case 'approved': return t('status.approved');
    case 'in_progress': return t('status.inProgress');
    case 'completed': return t('status.completed');
    case 'cancelled': return t('status.cancelled');
    case 'rejected': return t('status.rejected');
    default: return status;
  }
};

interface StatCardProps {
  value: number;
  label: string;
  color: string;
  isActive: boolean;
  onPress: () => void;
  theme: Theme;
}

function StatCard({ value, label, color, isActive, onPress, theme }: StatCardProps) {
  return (
    <Pressable 
      onPress={onPress}
      style={[
        styles.statCard, 
        { 
          backgroundColor: isActive ? applyOpacity(color, '20') : applyOpacity(color, '08'),
          borderWidth: isActive ? 2 : 0,
          borderColor: isActive ? color : 'transparent',
        }
      ]}
    >
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface RequestCardProps {
  request: UnifiedRequest;
  onPress: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  theme: Theme;
  t: (key: string) => string;
  formatDate: (date: string | Date) => string;
  formatTimeFromString: (time: string) => string;
  isRTL: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function RequestCard({ request, onPress, onApprove, onReject, theme, t, formatDate, formatTimeFromString, isRTL, isExpanded, onToggleExpand }: RequestCardProps) {
  const typeColor = getTypeColor(request.type, theme);
  const statusColor = getStatusColor(request.status, theme);
  const typeIcon = getTypeIcon(request.type);

  const hasExpandableDetails = useMemo(() => {
    if (request.type === 'visitor') {
      const originalData = request.originalData as VisitListItemDto;
      return Boolean(originalData?.visitor?.email || originalData?.visitor?.phone);
    }
    if (request.type === 'buffet') {
      return Boolean(request.guestCount);
    }
    if (request.type === 'valet') {
      return Boolean(request.vehicleInfo);
    }
    return false;
  }, [request]);

  const renderExpandedDetails = () => {
    if (!isExpanded) return null;

    if (request.type === 'visitor') {
      const originalData = request.originalData as VisitListItemDto;
      const hasDetails = originalData?.visitor?.email || originalData?.visitor?.phone;
      if (!hasDetails) return null;

      return (
        <View style={styles.expandedSection}>
          {originalData?.visitor?.email ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="mail" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {originalData.visitor.email}
              </ThemedText>
            </View>
          ) : null}
          {originalData?.visitor?.phone ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="phone" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {originalData.visitor.phone}
              </ThemedText>
            </View>
          ) : null}
        </View>
      );
    }

    if (request.type === 'buffet' && request.guestCount) {
      return (
        <View style={styles.expandedSection}>
          <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <DDIcon name="users" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('buffet.guestCount')}: {request.guestCount}
            </ThemedText>
          </View>
          {request.mealType ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="cloche" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {request.mealType}
              </ThemedText>
            </View>
          ) : null}
        </View>
      );
    }

    if (request.type === 'valet' && request.vehicleInfo) {
      const vehicle = request.vehicleInfo;
      return (
        <View style={styles.expandedSection}>
          {vehicle.plateNumber ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="hash" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('valet.plateNumber')}: {vehicle.plateNumber}
              </ThemedText>
            </View>
          ) : null}
          {(vehicle.make || vehicle.model) ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="truck" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}
              </ThemedText>
            </View>
          ) : null}
          {vehicle.color ? (
            <View style={[styles.expandedDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="droplet" size={14} color={theme.textSecondary} />
              <ThemedText style={[styles.expandedDetailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('valet.color')}: {vehicle.color}
              </ThemedText>
            </View>
          ) : null}
        </View>
      );
    }

    return null;
  };

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.typeAccent, { backgroundColor: statusColor }]} />
        
        <View style={styles.cardContent}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ThemedText style={[Typography.body, { fontWeight: '600', textAlign: isRTL ? 'right' : 'left', flex: 1 }]} numberOfLines={1}>
              {request.visitorName}
            </ThemedText>
          </View>

          <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {t('reception.hostName')}: {request.hostName}
          </ThemedText>

          <Spacer height={Spacing.sm} />

          <View style={[styles.detailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="calendar" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {formatDate(request.date)}
              </ThemedText>
            </View>
            <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {formatTimeFromString(request.time)}
              </ThemedText>
            </View>
          </View>

          {request.location ? (
            <>
              <Spacer height={Spacing.xs} />
              <View style={[styles.detailItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {request.location}
                </ThemedText>
              </View>
            </>
          ) : null}

          <Spacer height={Spacing.sm} />

          <View style={[styles.badgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.typeBadge, { backgroundColor: applyOpacity(typeColor, '12') }]}>
              <DDIcon name={typeIcon} size={12} color={typeColor} />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {request.type === 'visitor' ? t('services.visitor') : 
                 request.type === 'buffet' ? t('services.buffet') : t('services.valet')}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '12'), borderColor: statusColor }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(request.status, t)}
              </ThemedText>
            </View>
          </View>

          {renderExpandedDetails()}

          {hasExpandableDetails ? (
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }} 
              style={styles.toggleContainer}
            >
              <ThemedText style={[styles.toggleText, { color: theme.primary }]}>
                {isExpanded ? t('common.lessDetails') : t('common.moreDetails')}
              </ThemedText>
              <DDIcon 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={theme.primary} 
              />
            </Pressable>
          ) : null}

          {(request.canApprove || request.canCancel) ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {request.canApprove ? (
                  <Pressable
                    style={[styles.approveButton, { backgroundColor: '#22C55E', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onApprove?.();
                    }}
                  >
                    <DDIcon name="check" size={14} color="#FFFFFF" />
                    <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                      {t('actions.approve')}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {request.canCancel ? (
                  <Pressable
                    style={[styles.rejectButton, { borderColor: theme.error, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onReject?.();
                    }}
                  >
                    <DDIcon name="x" size={14} color={theme.error} />
                    <ThemedText style={[styles.actionButtonText, { color: theme.error }]}>
                      {t('actions.reject')}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

function LoadingSkeleton({ theme }: { theme: Theme }) {
  return (
    <View style={styles.paddedContent}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.skeletonLine, { backgroundColor: applyOpacity(theme.textSecondary, '20'), width: '40%' }]} />
          <Spacer height={Spacing.md} />
          <View style={[styles.skeletonLine, { backgroundColor: applyOpacity(theme.textSecondary, '20'), width: '70%' }]} />
          <Spacer height={Spacing.sm} />
          <View style={[styles.skeletonLine, { backgroundColor: applyOpacity(theme.textSecondary, '20'), width: '50%' }]} />
        </View>
      ))}
    </View>
  );
}

export default function AllRequestsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDate, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const queryClient = useQueryClient();
  
  const [typeFilter, setTypeFilter] = useState<RequestFilter>('visitor');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<UnifiedRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpanded = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const filters = useMemo(() => ({
    type: typeFilter,
    status: statusFilter,
    searchQuery,
    startDate: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
  }), [typeFilter, statusFilter, searchQuery, selectedDate]);

  const { data: requests, stats, isLoading, isFetching, isError, refetch } = useAllRequestsQuery(filters);
  
  const valetDateParam = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
  const { 
    data: valetDashboardData, 
    isLoading: isValetLoading, 
    isFetching: isValetFetching,
    isError: isValetError,
    refetch: refetchValet 
  } = useValetParkingDashboard(valetDateParam);

  const mapValetVisitorToUnified = useCallback((visitor: ValetParkingVisitorDto): UnifiedRequest => {
    const mapStatus = (status: string): UnifiedStatus => {
      const statusLower = status.toLowerCase();
      if (['checked_in', 'in_progress'].includes(statusLower)) return 'in_progress';
      if (['completed', 'checked_out'].includes(statusLower)) return 'completed';
      if (['approved', 'visitor_accepted'].includes(statusLower)) return 'approved';
      if (['cancelled', 'auto_cancelled'].includes(statusLower)) return 'cancelled';
      if (['rejected'].includes(statusLower)) return 'rejected';
      return 'pending';
    };

    return {
      id: visitor.requestId,
      type: 'valet' as UnifiedRequestType,
      visitorName: visitor.visitorName,
      hostName: visitor.hostName,
      date: visitor.visitDate,
      time: visitor.visitTime,
      status: mapStatus(visitor.status),
      location: visitor.hostDepartment,
      canApprove: false,
      canCancel: false,
      createdAt: visitor.visitDate,
      company: visitor.visitorCompany,
      vehicleInfo: visitor.licensePlate ? {
        make: '',
        model: visitor.carModel ?? '',
        color: visitor.carColor ?? '',
        plateNumber: visitor.licensePlate,
      } : undefined,
      originalData: visitor as any,
    };
  }, []);

  const valetRequests = useMemo(() => {
    if (!valetDashboardData?.data) return [];
    let mapped = valetDashboardData.data.map(mapValetVisitorToUnified);
    
    if (statusFilter !== 'all') {
      mapped = mapped.filter(r => r.status === statusFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      mapped = mapped.filter(r => 
        r.visitorName.toLowerCase().includes(query) || 
        r.hostName.toLowerCase().includes(query)
      );
    }
    return mapped;
  }, [valetDashboardData, statusFilter, searchQuery, mapValetVisitorToUnified]);

  const valetStats = useMemo(() => {
    if (!valetDashboardData?.summary) return null;
    return {
      total: valetDashboardData.summary.totalVisitors,
      withParking: valetDashboardData.summary.withParking,
      withoutParking: valetDashboardData.summary.withoutParking,
    };
  }, [valetDashboardData]);

  const displayRequests = typeFilter === 'valet' ? valetRequests : requests;
  const displayIsLoading = typeFilter === 'valet' ? isValetLoading : isLoading;
  const displayIsFetching = typeFilter === 'valet' ? isValetFetching : isFetching;
  const displayIsError = typeFilter === 'valet' ? isValetError : isError;

  const approveVisitMutation = useApproveVisitMutation();
  const rejectVisitMutation = useRejectVisitMutation();
  const updateBuffetMutation = useUpdateBuffetRequestMutation();
  const updateValetMutation = useUpdateValetAssignmentMutation();

  const handleRefresh = useCallback(() => {
    if (typeFilter === 'valet') {
      refetchValet();
    } else {
      refetch();
    }
  }, [refetch, refetchValet, typeFilter]);

  const invalidateAllQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['all-requests'] });
    queryClient.invalidateQueries({ queryKey: ['visits'] });
    queryClient.invalidateQueries({ queryKey: ['buffet-admin-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['valet-admin-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
  }, [queryClient]);

  const typeFilters: { id: RequestFilter; label: string; icon: IconName }[] = [
    { id: 'visitor', label: t('visitor.expectedVisitors'), icon: 'users' },
    { id: 'buffet', label: t('services.buffet'), icon: 'cloche' },
    { id: 'valet', label: t('services.valet'), icon: 'navigation' },
  ];

  const getStatusFiltersForType = useCallback((type: RequestFilter): { id: StatusFilter; label: string }[] => {
    const baseFilters: { id: StatusFilter; label: string }[] = [
      { id: 'all', label: t('common.all') },
      { id: 'pending', label: t('status.pending') },
    ];

    switch (type) {
      case 'visitor':
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.approved') },
          { id: 'in_progress', label: t('status.checkedIn') },
          { id: 'completed', label: t('status.checkedOut') },
          { id: 'rejected', label: t('status.rejected') },
        ];
      case 'buffet':
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.confirmed') },
          { id: 'in_progress', label: t('status.preparing') },
          { id: 'completed', label: t('status.delivered') },
          { id: 'cancelled', label: t('status.cancelled') },
        ];
      case 'valet':
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.assigned') },
          { id: 'in_progress', label: t('status.inProgress') },
          { id: 'completed', label: t('status.completed') },
          { id: 'cancelled', label: t('status.cancelled') },
        ];
      default:
        return [
          ...baseFilters,
          { id: 'approved', label: t('status.approved') },
          { id: 'in_progress', label: t('status.inProgress') },
          { id: 'completed', label: t('status.completed') },
          { id: 'cancelled', label: t('status.cancelled') },
        ];
    }
  }, [t]);

  const statusFilters = useMemo(() => getStatusFiltersForType(typeFilter), [getStatusFiltersForType, typeFilter]);

  const handleStatPress = (filter: StatusFilter) => {
    setStatusFilter(statusFilter === filter ? 'all' : filter);
  };

  const handleApprove = useCallback(async (request: UnifiedRequest) => {
    const confirmApprove = () => {
      setActionLoading(true);
      
      if (request.type === 'visitor') {
        approveVisitMutation.mutate(
          { id: request.id },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      } else if (request.type === 'buffet') {
        updateBuffetMutation.mutate(
          { id: request.id, data: { status: BuffetRequestStatus.CONFIRMED } },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      } else if (request.type === 'valet') {
        updateValetMutation.mutate(
          { id: request.id, data: { status: ValetAssignmentStatus.ACCEPTED } },
          {
            onSuccess: () => {
              invalidateAllQueries();
              setActionLoading(false);
            },
            onError: () => {
              setActionLoading(false);
            },
          }
        );
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('approvals.confirmApprove'))) {
        confirmApprove();
      }
    } else {
      Alert.alert(
        t('actions.approve'),
        t('approvals.confirmApprove'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('actions.approve'), style: 'default', onPress: confirmApprove },
        ]
      );
    }
  }, [approveVisitMutation, updateBuffetMutation, updateValetMutation, invalidateAllQueries, t]);

  const handleReject = useCallback((request: UnifiedRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const confirmReject = useCallback(() => {
    if (!selectedRequest || !rejectReason.trim()) return;
    
    setActionLoading(true);
    
    if (selectedRequest.type === 'visitor') {
      rejectVisitMutation.mutate(
        { id: selectedRequest.id, payload: { reason: rejectReason } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    } else if (selectedRequest.type === 'buffet') {
      updateBuffetMutation.mutate(
        { id: selectedRequest.id, data: { status: BuffetRequestStatus.CANCELLED } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    } else if (selectedRequest.type === 'valet') {
      updateValetMutation.mutate(
        { id: selectedRequest.id, data: { status: ValetAssignmentStatus.CANCELLED } },
        {
          onSuccess: () => {
            invalidateAllQueries();
            setShowRejectModal(false);
            setSelectedRequest(null);
            setActionLoading(false);
          },
          onError: () => {
            setActionLoading(false);
          },
        }
      );
    }
  }, [selectedRequest, rejectReason, rejectVisitMutation, updateBuffetMutation, updateValetMutation, invalidateAllQueries]);

  const navigation = useNavigation<NavigationProp<any>>();
  
  const handleCardPress = (request: UnifiedRequest) => {
    if (!request.id) {
      console.warn('Cannot navigate: request ID is undefined');
      return;
    }
    switch (request.type) {
      case 'visitor':
        navigation.navigate(ROUTES.MANAGER_APPROVAL_DETAIL as never, { requestId: request.id } as never);
        break;
      case 'buffet':
        navigation.navigate(ROUTES.BUFFET_REQUEST_DETAILS as never, { request: request.originalData } as never);
        break;
      case 'valet':
        break;
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
  };

  return (
    <ScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={displayIsFetching && !displayIsLoading}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.paddedContent}>
        <ThemedText style={Typography.title}>{t('navigation.allRequests')}</ThemedText>
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          {t('dashboard.overview')}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <StatCard
            value={stats.total}
            label={t('common.all')}
            color={theme.primary}
            isActive={statusFilter === 'all'}
            onPress={() => handleStatPress('all')}
            theme={theme}
          />
          <StatCard
            value={stats.pending}
            label={t('status.pending')}
            color={theme.warning}
            isActive={statusFilter === 'pending'}
            onPress={() => handleStatPress('pending')}
            theme={theme}
          />
          <StatCard
            value={stats.approved}
            label={t('status.approved')}
            color={theme.success}
            isActive={statusFilter === 'approved'}
            onPress={() => handleStatPress('approved')}
            theme={theme}
          />
          <StatCard
            value={stats.completed}
            label={t('common.done')}
            color={theme.info}
            isActive={statusFilter === 'completed'}
            onPress={() => handleStatPress('completed')}
            theme={theme}
          />
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.searchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.searchInputWrapper}>
            <SearchInput
              placeholder={t('common.search')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable 
            style={[
              styles.dateFilterButton, 
              { 
                backgroundColor: selectedDate ? applyOpacity(theme.primary, '12') : theme.surface,
                borderColor: selectedDate ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <DDIcon 
              name="calendar" 
              size={18} 
              color={selectedDate ? theme.primary : theme.textSecondary} 
            />
          </Pressable>
        </View>

        {selectedDate ? (
          <>
            <Spacer height={Spacing.sm} />
            <Pressable 
              style={[styles.dateChip, { backgroundColor: applyOpacity(theme.primary, '12') }]}
              onPress={clearDateFilter}
            >
              <DDIcon name="calendar" size={14} color={theme.primary} />
              <ThemedText style={[styles.dateChipText, { color: theme.primary }]}>
                {formatDate(selectedDate.toISOString())}
              </ThemedText>
              <DDIcon name="x" size={14} color={theme.primary} />
            </Pressable>
          </>
        ) : null}
      </View>

      <Spacer height={Spacing.md} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        nestedScrollEnabled={true}
      >
        {typeFilters.map(filter => (
          <Pressable
            key={filter.id}
            style={[
              styles.filterChip,
              { 
                backgroundColor: typeFilter === filter.id ? theme.primary : theme.surface,
                borderColor: typeFilter === filter.id ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setTypeFilter(filter.id)}
          >
            <DDIcon 
              name={filter.icon} 
              size={14} 
              color={typeFilter === filter.id ? theme.buttonText : theme.textSecondary} 
            />
            <ThemedText 
              style={[
                styles.filterChipText, 
                { color: typeFilter === filter.id ? theme.buttonText : theme.text }
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <Spacer height={Spacing.sm} />

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusFiltersRow}
        nestedScrollEnabled={true}
      >
        {statusFilters.map(filter => (
          <Pressable
            key={filter.id}
            style={[
              styles.statusChip,
              { 
                backgroundColor: statusFilter === filter.id ? applyOpacity(theme.info, '12') : 'transparent',
                borderColor: statusFilter === filter.id ? theme.info : theme.border,
              }
            ]}
            onPress={() => setStatusFilter(filter.id)}
          >
            <ThemedText 
              style={[
                styles.statusChipText, 
                { color: statusFilter === filter.id ? theme.info : theme.textSecondary }
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      <Spacer height={Spacing.lg} />

      {displayIsLoading ? (
        <LoadingSkeleton theme={theme} />
      ) : displayIsError ? (
        <View style={styles.paddedContent}>
          <EmptyState
            icon="alert-circle"
            title={t('errors.somethingWentWrong')}
            message={t('errors.tryAgain')}
          />
          <Spacer height={Spacing.md} />
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={handleRefresh}
          >
            <ThemedText style={[styles.retryButtonText, { color: theme.buttonText }]}>
              {t('common.retry')}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.paddedContent}>
          <View style={styles.resultsSummary}>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.showingXofY')
                .replace('{{shown}}', String(displayRequests.length))
                .replace('{{total}}', String(typeFilter === 'valet' ? (valetStats?.total ?? 0) : stats.total))}
            </ThemedText>
            {displayIsFetching ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
          </View>

          <Spacer height={Spacing.md} />

          {displayRequests.length > 0 ? (
            displayRequests.map(request => {
              const cardKey = `${request.type}-${request.id}`;
              return (
                <View key={cardKey}>
                  <RequestCard
                    request={request}
                    onPress={() => handleCardPress(request)}
                    onApprove={() => handleApprove(request)}
                    onReject={() => handleReject(request)}
                    theme={theme}
                    t={t}
                    formatDate={formatDate}
                    formatTimeFromString={formatTimeFromString}
                    isRTL={isRTL}
                    isExpanded={expandedCards.has(cardKey)}
                    onToggleExpand={() => toggleCardExpanded(cardKey)}
                  />
                  <Spacer height={LAYOUT.contentGap} />
                </View>
              );
            })
          ) : (
            <EmptyState
              icon="inbox"
              title={t('common.noResults')}
              message={t('requests.tryDifferentFilters')}
            />
          )}
        </View>
      )}

      <Spacer height={Spacing.xxl} />

      <CalendarDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={selectedDate || new Date()}
        onDateSelect={(date) => {
          setSelectedDate(date);
          setShowDatePicker(false);
        }}
      />

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
            <ThemedText style={[Typography.subtitle, { marginBottom: Spacing.md }]}>
              {t('actions.reject')}
            </ThemedText>
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginBottom: Spacing.lg }]}>
              {t('approvals.enterRejectReason')}
            </ThemedText>
            <TextInput
              style={[
                styles.reasonInput,
                { 
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                }
              ]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('approvals.rejectReasonPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: applyOpacity(theme.error, '12') }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                }}
                disabled={actionLoading}
              >
                <ThemedText style={[styles.modalButtonText, { color: theme.textSecondary }]}>
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton, 
                  { 
                    backgroundColor: theme.error,
                    opacity: !rejectReason.trim() || actionLoading ? 0.5 : 1,
                  }
                ]}
                onPress={confirmReject}
                disabled={!rejectReason.trim() || actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    {t('actions.reject')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  paddedContent: {
    paddingHorizontal: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
  },
  dateFilterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  statusFiltersRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestCard: {
    borderRadius: LAYOUT.cardRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    borderTopStartRadius: LAYOUT.cardRadius,
    borderBottomStartRadius: LAYOUT.cardRadius,
  },
  cardContent: {
    padding: LAYOUT.cardPadding,
    paddingStart: LAYOUT.cardPadding + 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  expandedDetailRow: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  expandedDetailText: {
    fontSize: 13,
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skeletonCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  skeletonLine: {
    height: 16,
    borderRadius: BorderRadius.sm,
  },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignSelf: 'center',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
