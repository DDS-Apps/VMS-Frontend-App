import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DDIcon, IconName } from '@/components/DDIcon';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { SearchInput } from '@/components/SearchInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { applyOpacity } from '@/utils/statusStyles';
import { 
  getAllRequests,
  RequestSummary,
} from '@/services/mock/buildingAdminState';
import type { Theme } from '@/types/theme.types';

const LAYOUT = {
  cardPadding: Spacing.lg,
  cardRadius: BorderRadius.md,
  contentGap: Spacing.md,
};

type RequestFilter = 'all' | 'visitor' | 'buffet' | 'valet';
type StatusFilter = 'all' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

const getTypeColor = (type: RequestSummary['type'], theme: Theme) => {
  switch (type) {
    case 'visitor': return theme.primary;
    case 'buffet': return '#FF6B35';
    case 'valet': return '#6366F1';
    case 'walk_in': return theme.info;
    default: return theme.textSecondary;
  }
};

const getStatusColor = (status: string, theme: Theme) => {
  if (status === 'approved' || status === 'completed') return theme.success;
  if (status === 'pending' || status === 'pending_approval' || status === 'in_progress') return theme.warning;
  if (status === 'rejected' || status === 'cancelled') return theme.error;
  return theme.textSecondary;
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

interface RequestCardProps {
  request: RequestSummary;
  onPress: () => void;
  onApprove?: () => void;
  onCancel?: () => void;
  theme: Theme;
  t: (key: string) => string;
}

function RequestCard({ request, onPress, onApprove, onCancel, theme, t }: RequestCardProps) {
  const typeColor = getTypeColor(request.type, theme);
  const statusColor = getStatusColor(request.status, theme);

  return (
    <Pressable onPress={onPress}>
      <ThemedView style={[styles.requestCard, { backgroundColor: theme.surface }]}>
        <View style={[styles.typeAccent, { backgroundColor: typeColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: applyOpacity(typeColor, '12') }]}>
              <DDIcon 
                name={
                  request.type === 'visitor' ? 'user' : 
                  request.type === 'buffet' ? 'coffee' : 
                  request.type === 'valet' ? 'navigation' : 'user-plus'
                } 
                size={12} 
                color={typeColor} 
              />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: applyOpacity(statusColor, '12'), borderColor: statusColor }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {formatStatus(request.status)}
              </ThemedText>
            </View>
          </View>

          <Spacer height={Spacing.md} />

          <ThemedText style={[Typography.body, { fontWeight: '600' }]} numberOfLines={1}>
            {request.visitorName}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]} numberOfLines={1}>
            {t('reception.hostName')}: {request.hostName}
          </ThemedText>

          <Spacer height={Spacing.sm} />

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <DDIcon name="calendar" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.date}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <DDIcon name="clock" size={14} variant="muted" />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {request.time}
              </ThemedText>
            </View>
          </View>

          {request.location ? (
            <>
              <Spacer height={Spacing.xs} />
              <View style={styles.detailItem}>
                <DDIcon name="map-pin" size={14} variant="muted" />
                <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {request.location}
                </ThemedText>
              </View>
            </>
          ) : null}

          {(request.canApprove || request.canCancel) ? (
            <>
              <Spacer height={Spacing.md} />
              <View style={styles.actionsRow}>
                {request.canApprove ? (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: applyOpacity(theme.success, '12') }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onApprove?.();
                    }}
                  >
                    <DDIcon name="check" size={14} color={theme.success} />
                    <ThemedText style={[styles.actionButtonText, { color: theme.success }]}>
                      {t('actions.approve')}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {request.canCancel ? (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: applyOpacity(theme.error, '12') }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onCancel?.();
                    }}
                  >
                    <DDIcon name="x" size={14} color={theme.error} />
                    <ThemedText style={[styles.actionButtonText, { color: theme.error }]}>
                      {t('common.cancel')}
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

export default function AllRequestsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [typeFilter, setTypeFilter] = useState<RequestFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      setRequests(getAllRequests());
    }, [])
  );

  const typeFilters: { id: RequestFilter; label: string; icon: IconName }[] = [
    { id: 'all', label: t('common.all'), icon: 'layers' },
    { id: 'visitor', label: t('visitor.expectedVisitors'), icon: 'users' },
    { id: 'buffet', label: t('services.buffet'), icon: 'coffee' },
    { id: 'valet', label: t('services.valet'), icon: 'navigation' },
  ];

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t('common.all') },
    { id: 'pending', label: t('status.pending') },
    { id: 'approved', label: t('status.approved') },
    { id: 'in_progress', label: t('status.inProgress') },
    { id: 'completed', label: t('status.completed') },
    { id: 'cancelled', label: t('status.cancelled') },
  ];

  const filteredRequests = requests.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && r.status !== 'pending' && r.status !== 'pending_approval') return false;
      if (statusFilter !== 'pending' && !r.status.includes(statusFilter)) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.visitorName.toLowerCase().includes(query) || 
             r.hostName.toLowerCase().includes(query);
    }
    return true;
  });

  const handleApprove = (request: RequestSummary) => {
    console.log('Approve request:', request.id);
  };

  const handleCancel = (request: RequestSummary) => {
    console.log('Cancel request:', request.id);
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending' || r.status === 'pending_approval').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <ScreenScrollView>
      <View style={styles.paddedContent}>
        <ThemedText style={Typography.title}>{t('navigation.allRequests')}</ThemedText>
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          {t('dashboard.overview')}
        </ThemedText>

        <Spacer height={Spacing.lg} />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: applyOpacity(theme.primary, '08') }]}>
            <ThemedText style={[styles.statValue, { color: theme.primary }]}>{stats.total}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t('common.all')}</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: applyOpacity(theme.warning, '08') }]}>
            <ThemedText style={[styles.statValue, { color: theme.warning }]}>{stats.pending}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t('status.pending')}</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: applyOpacity(theme.success, '08') }]}>
            <ThemedText style={[styles.statValue, { color: theme.success }]}>{stats.approved}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t('status.approved')}</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: applyOpacity(theme.info, '08') }]}>
            <ThemedText style={[styles.statValue, { color: theme.info }]}>{stats.completed}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{t('common.done')}</ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <SearchInput
          placeholder={t('common.search')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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

      <View style={styles.paddedContent}>
        <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
          {t('dashboard.showingXofY').replace('{{shown}}', String(filteredRequests.length)).replace('{{total}}', String(requests.length))}
        </ThemedText>

        <Spacer height={Spacing.md} />

        {filteredRequests.length > 0 ? (
          filteredRequests.map(request => (
            <View key={request.id}>
              <RequestCard
                request={request}
                onPress={() => console.log('View details:', request.id)}
                onApprove={() => handleApprove(request)}
                onCancel={() => handleCancel(request)}
                theme={theme}
                t={t}
              />
              <Spacer height={LAYOUT.contentGap} />
            </View>
          ))
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="inbox" size={48} variant="muted" />
            <Spacer height={Spacing.md} />
            <ThemedText style={[Typography.body, { color: theme.textSecondary }]}>
              {t('common.noResults')}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
              {t('common.filter')}
            </ThemedText>
          </ThemedView>
        )}
      </View>

      <Spacer height={Spacing.xxl} />
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
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: Spacing.xl * 2,
    borderRadius: LAYOUT.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
