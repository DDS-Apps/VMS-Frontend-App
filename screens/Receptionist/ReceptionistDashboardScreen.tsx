import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Dimensions, GestureResponderEvent, LayoutAnimation, Platform, UIManager, Alert } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ROUTES } from "@/constants";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useFormatters } from "@/hooks/useFormatters";
import { useLanguage } from "@/contexts/LanguageContext";
import { DDIcon, IconName } from "@/components/DDIcon";
import { VisitorActionButton } from "@/components/VisitorActionButton";
import { applyOpacity } from "@/utils/statusStyles";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTodayVisitorsQuery, useRoomsTodayQuery, useReceptionCheckInMutation, useReceptionCheckOutMutation } from "@/hooks/queries/useReceptionQueries";
import type { TodayVisitorDto, RoomStatusDto } from "@/types";
import { SkeletonDashboard, WalkInBadge } from "@/components/shared";
import type { ReceptionistDashboardScreenProps } from "@/types/receptionistNavigation.types";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const screenWidth = Dimensions.get('window').width;

interface KPICardProps {
  title: string;
  value: string;
  icon: IconName;
  iconBgColor: string;
  iconColor: string;
  cardBgColor: string;
}

function KPICard({ title, value, icon, iconBgColor, iconColor, cardBgColor }: KPICardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: cardBgColor }]}>
      <View style={[styles.kpiIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={28} color={iconColor} />
      </View>

      <Spacer height={Spacing.lg} />

      <ThemedText style={[styles.kpiValue, { color: theme.text }]}>
        {value}
      </ThemedText>

      <Spacer height={Spacing.xs} />

      <ThemedText style={[styles.kpiLabel, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

interface QuickActionProps {
  icon: IconName;
  label: string;
  iconBgColor: string;
  iconColor: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, iconBgColor, iconColor, onPress }: QuickActionProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIconContainer, { backgroundColor: iconBgColor }]}>
        <DDIcon name={icon} size={24} color={iconColor} />
      </View>
      <Spacer height={Spacing.sm} />
      <ThemedText style={[styles.quickActionLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const ServiceIconsRow = ({ visitor, size = 14 }: { visitor: TodayVisitorDto; size?: number }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  
  const showParking = visitor.isVisitorNeedsParking === true || visitor.visitorNeedsParking === true || visitor.hasParking === true || !!visitor.parkingSlot;
  const showMeetingRoom = visitor.isMeetingRoom === true || visitor.hasMeetingRoom === true || !!visitor.meetingRoom;
  const showBuffet = visitor.isBuffet === true || visitor.hasBuffet === true;
  
  const hasServices = showParking || showMeetingRoom || showBuffet;
  
  if (!hasServices) {
    return <View />;
  }

  return (
    <View style={[styles.servicesRow, { flexDirection: 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
      {showBuffet ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.warning, '20') }]}>
          <DDIcon name="coffee" size={size} color={theme.warning} />
        </View>
      ) : null}
      {showMeetingRoom ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.secondary, '20') }]}>
          <DDIcon name="briefcase" size={size} color={theme.secondary} />
        </View>
      ) : null}
      {showParking ? (
        <View style={[styles.servicePill, { backgroundColor: applyOpacity(theme.info, '20') }]}>
          <DDIcon name="map-pin" size={size} color={theme.info} />
        </View>
      ) : null}
    </View>
  );
};

export default function ReceptionistDashboardScreen({ navigation }: ReceptionistDashboardScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatTime, formatTimeFromString } = useFormatters();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedVisitors, setExpandedVisitors] = useState<Set<string>>(new Set());

  const { data: todayResponse, isLoading: isLoadingVisitors, isFetching: isFetchingVisitors, isError: isVisitorError, error: visitorError } = useTodayVisitorsQuery();
  const { data: roomsData, isLoading: isLoadingRooms, isFetching: isFetchingRooms, isError: isRoomsError, error: roomsError } = useRoomsTodayQuery();
  const checkInMutation = useReceptionCheckInMutation();
  const checkOutMutation = useReceptionCheckOutMutation();

  const todaysVisitors = todayResponse?.data ?? [];
  const summary = todayResponse?.summary;
  const roomMeetings = roomsData ?? [];
  const isLoading = isLoadingVisitors || isLoadingRooms;
  const isFetching = isFetchingVisitors || isFetchingRooms;
  const isError = isVisitorError || isRoomsError;
  const errorMessage = visitorError?.message || roomsError?.message || t('common.loadError');

  const hasShownError = useRef(false);

  useEffect(() => {
    if (isError && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(t('common.error'), errorMessage);
    }
    if (!isError) {
      hasShownError.current = false;
    }
  }, [isError, errorMessage, t]);

  const scrollContentStyle = {
    paddingHorizontal: Spacing.lg,
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl + 80
  };

  const toggleRoomExpanded = (roomId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const toggleVisitorExpanded = (visitorId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedVisitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitorId)) {
        newSet.delete(visitorId);
      } else {
        newSet.add(visitorId);
      }
      return newSet;
    });
  };

  const handleCheckIn = (visitorId: string, visitorName: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    
    checkInMutation.mutate(
      { visitId: visitorId },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_in',
            visitorName,
            time: currentTime
          } as never);
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkInFailed'));
        }
      }
    );
  };

  const handleCheckOut = (visitorId: string, visitorName: string, event: GestureResponderEvent) => {
    event.stopPropagation();
    
    checkOutMutation.mutate(
      { visitId: visitorId },
      {
        onSuccess: () => {
          const currentTime = formatTime(new Date());
          navigation.navigate(ROUTES.CHECK_IN_OUT_CONFIRMATION as never, {
            action: 'check_out',
            visitorName,
            time: currentTime
          } as never);
        },
        onError: (error) => {
          Alert.alert(t('common.error'), error.message || t('errors.checkOutFailed'));
        }
      }
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { label: t('status.checkedIn'), bg: applyOpacity(theme.success, '15'), text: theme.success, border: theme.success };
      case 'completed':
        return { label: t('status.checkedOut'), bg: applyOpacity(theme.textSecondary, '15'), text: theme.textSecondary, border: theme.textSecondary };
      default:
        return { label: t('visitor.expectedVisitors'), bg: applyOpacity(theme.warning, '15'), text: theme.warning, border: theme.warning };
    }
  };

  const handleVisitorPress = (visitor: TodayVisitorDto) => {
    const today = new Date().toISOString().split('T')[0];
    const legacyVisitor = {
      id: visitor.id,
      name: visitor.visitor.fullName,
      company: visitor.visitor.company ?? '',
      time: visitor.visitTime,
      host: visitor.hostName,
      status: (visitor.status === 'expected' ? 'pending' : visitor.status) as 'pending' | 'checked_in' | 'completed',
      isWalkIn: false,
      phone: visitor.visitor.phone ?? '',
      parking: visitor.parkingSlot?.slotNumber,
      origin: 'scheduled' as const,
      scheduledFor: today,
      createdAt: today,
    };
    navigation.navigate(ROUTES.VISITOR_DETAIL as never, { visitor: legacyVisitor } as never);
  };

  const checkedInCount = summary?.checkedIn ?? todaysVisitors.filter(v => v.status === 'checked_in').length;
  const pendingCount = summary?.pending ?? todaysVisitors.filter(v => v.status === 'pending' || v.status === 'expected').length;
  const expectedCount = summary?.expected ?? todaysVisitors.length;

  const renderVisitorCard = (item: TodayVisitorDto) => {
    const statusConfig = getStatusConfig(item.status);
    const visitorName = item.visitor.fullName;
    const initials = visitorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const showCheckIn = item.status === 'pending' || item.status === 'expected';
    const showCheckOut = item.status === 'checked_in';
    const isMutating = checkInMutation.isPending || checkOutMutation.isPending;
    const isExpanded = expandedVisitors.has(item.id);
    const hasDetails = item.visitor.phone;
    
    return (
      <Pressable 
        key={item.id}
        onPress={() => handleVisitorPress(item)}
        style={({ pressed }) => [
          styles.visitorCard,
          { 
            backgroundColor: theme.surface,
            borderStartColor: statusConfig.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.visitorCardHeader, { flexDirection: 'row' }]}>
          <View style={[styles.avatar, { backgroundColor: applyOpacity(theme.primary, '12') }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {initials}
            </ThemedText>
          </View>
          <View style={[styles.visitorHeaderInfo, { marginStart: isRTL ? 0 : Spacing.sm, marginEnd: isRTL ? Spacing.sm : 0 }]}>
            <View style={[styles.nameRow, { flexDirection: 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
              <ThemedText style={[styles.visitorName, { color: theme.text }]} numberOfLines={1}>
                {visitorName}
              </ThemedText>
              {item.isWalkIn ? <WalkInBadge size="sm" /> : null}
            </View>
            <ThemedText style={[styles.visitorCompany, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.visitor.company ?? ''}
            </ThemedText>
          </View>
        </View>

        <Spacer height={Spacing.md} />

        <View style={[styles.visitorMetaRow, { flexDirection: 'row' }]}>
          <DDIcon name="clock" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.visitorMetaText, { color: theme.textSecondary }]}>
            {formatTimeFromString(item.visitTime)}
          </ThemedText>
          <View style={styles.metaDot} />
          <DDIcon name="user" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.visitorMetaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {t('reception.hostName')}: {item.hostName}
          </ThemedText>
        </View>

        <Spacer height={Spacing.md} />

        <View style={[styles.servicesStatusRow, { flexDirection: 'row' }]}>
          <ServiceIconsRow visitor={item} />
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border, borderWidth: 1 }]}>
            <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </ThemedText>
          </View>
        </View>

        {isExpanded && hasDetails ? (
          <View style={styles.expandedSection}>
            {item.visitor.phone ? (
              <View style={[styles.detailRow, { flexDirection: 'row' }]}>
                <DDIcon name="phone" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.detailText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {item.visitor.phone}
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {hasDetails ? (
          <Pressable 
            onPress={(e) => { e.stopPropagation(); toggleVisitorExpanded(item.id); }} 
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

        <Spacer height={Spacing.md} />

        <View style={[styles.visitorCardFooter, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          {showCheckIn ? (
            <VisitorActionButton 
              type="check_in" 
              onPress={(e) => handleCheckIn(item.id, visitorName, e)}
              disabled={isMutating}
            />
          ) : showCheckOut ? (
            <VisitorActionButton 
              type="check_out" 
              onPress={(e) => handleCheckOut(item.id, visitorName, e)}
              disabled={isMutating}
            />
          ) : (
            <VisitorActionButton type="completed" />
          )}
        </View>
      </Pressable>
    );
  };

  if (isLoading || isFetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.xl, paddingHorizontal: Spacing.lg }]}>
        <SkeletonDashboard cards={3} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.xl, paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' }]}>
        <DDIcon name="alert-triangle" size={48} variant="muted" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('common.loadError')}
        </ThemedText>
      </View>
    );
  }

  return (
    <>
      <ScreenScrollView contentContainerStyle={scrollContentStyle}>
        <View style={[styles.kpiRow, { flexDirection: 'row' }]}>
          <KPICard 
            title={t('dashboard.expectedToday')} 
            value={String(expectedCount)} 
            icon="users" 
            iconBgColor={applyOpacity(theme.primary, '20')}
            iconColor={theme.primary}
            cardBgColor={applyOpacity(theme.primary, '06')}
          />
          <KPICard 
            title={t('dashboard.checkedIn')} 
            value={String(checkedInCount)} 
            icon="user-check" 
            iconBgColor={applyOpacity(theme.success, '20')}
            iconColor={theme.success}
            cardBgColor={applyOpacity(theme.success, '06')}
          />
          <KPICard 
            title={t('dashboard.pending')} 
            value={String(pendingCount)} 
            icon="clock" 
            iconBgColor={applyOpacity(theme.warning, '20')}
            iconColor={theme.warning}
            cardBgColor={applyOpacity(theme.warning, '06')}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('dashboard.quickActions')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        <View style={[styles.quickActionsRow, { flexDirection: 'row' }]}>
          <QuickActionButton
            icon="users"
            label={t('navigation.allVisitors')}
            iconBgColor={applyOpacity(theme.primary, '12')}
            iconColor={theme.primary}
            onPress={() => navigation.navigate(ROUTES.ALL_VISITORS as never)}
          />
          <QuickActionButton
            icon="user-plus"
            label={t('navigation.walkInVisitors')}
            iconBgColor={applyOpacity(theme.success, '12')}
            iconColor={theme.success}
            onPress={() => navigation.navigate(ROUTES.WALK_IN_VISITORS as never)}
          />
          <QuickActionButton
            icon="clock"
            label={t('navigation.todaysVisitors')}
            iconBgColor={applyOpacity(theme.warning, '12')}
            iconColor={theme.warning}
            onPress={() => navigation.navigate(ROUTES.ALL_VISITORS_TODAY as never)}
          />
        </View>

        <Spacer height={Spacing.xl} />

        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {t('reception.todaysMeetingsByRoom')}
        </ThemedText>

        <Spacer height={Spacing.md} />

        {roomMeetings.length > 0 ? (
          <View style={styles.meetingsContainer}>
            {roomMeetings.map((room) => {
              const isExpanded = expandedRooms.has(room.id);
              const hasBookings = room.currentBooking || room.nextBooking;
              const statusColor = room.status === 'available' ? theme.success 
                : room.status === 'occupied' ? theme.error 
                : room.status === 'reserved' ? theme.warning 
                : theme.textSecondary;
              
              return (
                <View 
                  key={room.id} 
                  style={[styles.roomCard, { backgroundColor: theme.surface }]}
                >
                  <Pressable
                      style={[styles.roomHeader, { flexDirection: 'row' }]}
                      onPress={() => toggleRoomExpanded(room.id)}
                    >
                      <View style={[styles.roomHeaderLeft, { flexDirection: 'row' }]}>
                        <View style={[styles.roomIconContainer, { backgroundColor: applyOpacity(theme.info, '12') }]}>
                          <DDIcon name="home" size={20} color={theme.info} />
                        </View>
                        <View style={styles.roomInfo}>
                          <ThemedText style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                            {room.name}
                          </ThemedText>
                          <ThemedText style={[styles.roomFloor, { color: theme.textSecondary }]}>
                            {room.floor ? `${t('parking.floor')} ${room.floor}` : `${t('reception.capacity')}: ${room.capacity}`}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={[styles.roomHeaderRight, { flexDirection: 'row' }]}>
                        <View style={[styles.meetingCountBadge, { backgroundColor: applyOpacity(statusColor, '12') }]}>
                          <ThemedText style={[styles.meetingCountText, { color: statusColor }]}>
                            {room.status}
                          </ThemedText>
                        </View>
                        {hasBookings ? (
                          <DDIcon 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={theme.textSecondary} 
                          />
                        ) : null}
                      </View>
                    </Pressable>

                  {isExpanded && hasBookings ? (
                    <View style={[styles.meetingsList, { borderTopColor: theme.border }]}>
                      {room.currentBooking ? (
                        <View style={styles.meetingItem}>
                          <View style={[styles.meetingTimeSlot, { flexDirection: 'row' }]}>
                            <DDIcon name="clock" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.meetingTime, { color: theme.textSecondary }]}>
                              {room.currentBooking.startTime} - {room.currentBooking.endTime ?? t('common.ongoing')}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.meetingTitle, { color: theme.text }]} numberOfLines={1}>
                            {room.currentBooking.visitorName}
                          </ThemedText>
                          {room.currentBooking.hostName ? (
                            <View style={[styles.meetingMeta, { flexDirection: 'row' }]}>
                              <DDIcon name="user" size={12} color={theme.textSecondary} />
                              <ThemedText style={[styles.meetingHost, { color: theme.textSecondary }]} numberOfLines={1}>
                                {room.currentBooking.hostName}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      ) : null}
                      {room.nextBooking ? (
                        <View style={[styles.meetingItem, room.currentBooking && { borderTopWidth: 1, borderTopColor: applyOpacity(theme.border, '50') }]}>
                          <View style={[styles.meetingTimeSlot, { flexDirection: 'row' }]}>
                            <DDIcon name="clock" size={14} color={theme.textSecondary} />
                            <ThemedText style={[styles.meetingTime, { color: theme.textSecondary }]}>
                              {t('reception.next')}: {room.nextBooking.startTime}
                            </ThemedText>
                          </View>
                          <ThemedText style={[styles.meetingTitle, { color: theme.text }]} numberOfLines={1}>
                            {room.nextBooking.visitorName}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="calendar" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('reception.noMeetingsToday')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />

        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            {t('navigation.todaysVisitors')}
          </ThemedText>
          {todaysVisitors.length > 3 ? (
            <Pressable 
              onPress={() => navigation.navigate(ROUTES.ALL_VISITORS_TODAY as never)}
              style={({ pressed }) => [
                styles.viewAllButton,
                { opacity: pressed ? 0.7 : 1, flexDirection: 'row' }
              ]}
            >
              <ThemedText style={[styles.viewAllText, { color: theme.primary }]}>
                {t('common.viewAll')}
              </ThemedText>
              <DDIcon name="chevron-right" size={16} variant="primary" directionAware />
            </Pressable>
          ) : null}
        </View>

        <Spacer height={Spacing.md} />

        {todaysVisitors.length > 0 ? (
          <View style={styles.visitorsList}>
            {todaysVisitors.slice(0, 3).map((visitor) => renderVisitorCard(visitor))}
          </View>
        ) : (
          <ThemedView style={[styles.emptyState, { backgroundColor: theme.surface }]}>
            <DDIcon name="users" size={32} variant="muted" />
            <Spacer height={Spacing.sm} />
            <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary }]}>
              {t('dashboard.noUpcomingVisitors')}
            </ThemedText>
          </ThemedView>
        )}

        <Spacer height={Spacing.xl} />
      </ScreenScrollView>

      <Pressable
        style={[
          styles.fab,
          { 
            backgroundColor: theme.primary,
            bottom: insets.bottom + 80 + Spacing.lg,
          },
        ]}
        onPress={() => navigation.navigate(ROUTES.WALK_IN_REGISTRATION as never)}
      >
        <DDIcon name="user-plus" size={24} color="#FFFFFF" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 0,
    elevation: 0,
  },
  kpiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
  },
  quickActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  meetingsContainer: {
    gap: Spacing.sm,
  },
  roomCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  roomHeader: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  roomIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomFloor: {
    fontSize: 12,
    marginTop: 2,
  },
  roomHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  meetingCountBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  meetingCountText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  meetingsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  meetingItem: {
    paddingVertical: Spacing.sm,
  },
  meetingTimeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 12,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  meetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  meetingHost: {
    fontSize: 12,
  },
  visitorsList: {
    gap: Spacing.sm,
  },
  visitorCard: {
    borderRadius: 12,
    padding: Spacing.md,
    borderStartWidth: 4,
  },
  visitorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  visitorHeaderInfo: {
    flex: 1,
    marginStart: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  visitorCompany: {
    fontSize: 12,
    marginTop: 2,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  visitorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  visitorMetaText: {
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  servicesStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servicesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  servicePill: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  detailText: {
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
  visitorCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
