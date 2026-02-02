import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { useUserQuery, useDeleteUserMutation } from '@/hooks/queries/useUserQueries';
import { useFormatters } from '@/hooks/useFormatters';
import { UserRole } from '@/types/vms.types';
import { DirectionalRow, getFlexDirection } from '@/components/DirectionalRow';
import { formatPhoneNumber } from '@/utils/formatters';

type RootStackParamList = {
  UserDetail: { userId: string };
  UsersRoles: undefined;
};

type UserDetailRouteProp = RouteProp<RootStackParamList, 'UserDetail'>;
type UserDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function UserDetailScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();  const { formatDate: fmtDate } = useFormatters();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<UserDetailNavigationProp>();
  const route = useRoute<UserDetailRouteProp>();
  const { showError, showSuccess } = useToast();

  const { userId } = route.params;

  const { data: user, isLoading, isFetching, isError, error, refetch } = useUserQuery(userId);
  const deleteMutation = useDeleteUserMutation();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const getRoleLabel = (role: string) => {
    const roleKey = role.toLowerCase() as UserRole;
    const roleLabels: Record<UserRole, string> = {
      employee: t('roles.employee'),
      manager: t('roles.manager'),
      receptionist: t('roles.receptionist'),
      security: t('roles.security'),
      building_admin: t('roles.buildingAdmin'),
      buffet_admin: t('roles.buffetAdmin'),
      buffet_staff: t('roles.buffetStaff'),
      valet_admin: t('roles.valetAdmin'),
      valet_driver: t('roles.valetDriver'),
      visitor: t('roles.visitor'),
    };
    return roleLabels[roleKey] || role;
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    await deleteMutation.mutateAsync(userId);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalVisible(false);
    showSuccess(t('toast.successTitle'), t('toast.userDeleted'));
    navigation.goBack();
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return fmtDate(date, 'medium');
    } catch {
      return dateString;
    }
  };

  if (isLoading || isFetching) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Spacer height={Spacing.md} />
        <ThemedText style={{ color: theme.textSecondary }}>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isError || !user) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <DDIcon name="alert-circle" size={48} variant="danger" />
        <Spacer height={Spacing.md} />
        <ThemedText style={[Typography.subtitle, { color: theme.error, textAlign: 'center' }]}>
          {error?.message || t('toast.unknownError')}
        </ThemedText>
        <Spacer height={Spacing.lg} />
        <Pressable
          style={[styles.retryButton, { backgroundColor: theme.primary, flexDirection: getFlexDirection(isRTL) }]}
          onPress={() => refetch()}
        >
          <DDIcon name="refresh-cw" size={16} color={theme.buttonText} />
          <ThemedText style={[Typography.body, { color: theme.buttonText, marginStart: Spacing.sm }]}>
            {t('common.retry')}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const userName = (user as any).name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  const userFirstName = (user as any).name?.split(' ')[0] || user.firstName || '';
  const userLastName = (user as any).name?.split(' ').slice(1).join(' ') || user.lastName || '';
  const userPhone = (user as any).phoneNumber || user.phone || '';
  const userBusinessPhone = (user as any).businessPhone || '';
  const userLandline = (user as any).landline || '';
  const apiSource = (user as any).source;
  const source = apiSource === 'azure_ad' ? 'microsoft_ad' : (apiSource || (user.azureAdId ? 'microsoft_ad' : 'app_created'));
  
  // Check user active status from both isActive boolean and status string
  const isUserActive = user.isActive === true || user.status === 'active';

  return (
    <ScreenScrollView>
      <View style={styles.content}>
        <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
            <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
              {userFirstName.charAt(0).toUpperCase()}{userLastName.charAt(0).toUpperCase() || userFirstName.charAt(1)?.toUpperCase() || ''}
            </ThemedText>
          </View>
          <Spacer height={Spacing.md} />
          <ThemedText style={[Typography.h2, { textAlign: 'center' }]}>
            {userName}
          </ThemedText>
          <ThemedText style={[Typography.body, { color: theme.textSecondary, textAlign: 'center' }]}>
            {user.email}
          </ThemedText>
          <Spacer height={Spacing.md} />
          <DirectionalRow style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
              <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                {getRoleLabel(user.role)}
              </ThemedText>
            </View>
            <DirectionalRow style={[styles.statusBadge, { backgroundColor: isUserActive ? theme.success + '20' : theme.error + '20' }]}>
              <DDIcon 
                name={isUserActive ? 'check-circle' : 'x-circle'} 
                size={12} 
                color={isUserActive ? theme.success : theme.error} 
              />
              <ThemedText style={[Typography.caption, { color: isUserActive ? theme.success : theme.error, fontWeight: '600', marginStart: 4 }]}>
                {isUserActive ? t('common.active') : t('common.inactive')}
              </ThemedText>
            </DirectionalRow>
          </DirectionalRow>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('common.viewDetails')}
          </ThemedText>

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="user" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('form.fullName')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>{userName}</ThemedText>
            </View>
          </DirectionalRow>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="mail" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('form.email')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>{user.email}</ThemedText>
            </View>
          </DirectionalRow>

          {userPhone ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="phone" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.phone')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, {}]}>{formatPhoneNumber(userPhone)}</ThemedText>
                </View>
              </DirectionalRow>
            </>
          ) : null}

          {userBusinessPhone ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="phone" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.businessPhone')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, {}]}>{formatPhoneNumber(userBusinessPhone)}</ThemedText>
                </View>
              </DirectionalRow>
            </>
          ) : null}

          {userLandline ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="phone" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.landline')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, {}]}>{formatPhoneNumber(userLandline)}</ThemedText>
                </View>
              </DirectionalRow>
            </>
          ) : null}

          {user.department ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <DirectionalRow style={styles.infoRow}>
                <DDIcon name="briefcase" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.company')}
                  </ThemedText>
                  <ThemedText style={[Typography.body, {}]}>{user.department}</ThemedText>
                </View>
              </DirectionalRow>
            </>
          ) : null}
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('settings.title')}
          </ThemedText>

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="shield" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.role')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>{getRoleLabel(user.role)}</ThemedText>
            </View>
          </DirectionalRow>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="check-circle" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.autoApproval')}
              </ThemedText>
              <View style={styles.autoApprovalValue}>
                {(user.canBypassApproval || user.autoApproval) ? (
                  <DirectionalRow style={[styles.enabledBadge, { backgroundColor: theme.success + '20' }]}>
                    <DDIcon name="check" size={12} color={theme.success} />
                    <ThemedText style={[Typography.caption, { color: theme.success, fontWeight: '600', marginStart: 4 }]}>
                      {t('common.autoApprovalEnabled')}
                    </ThemedText>
                  </DirectionalRow>
                ) : (
                  <DirectionalRow style={[styles.enabledBadge, { backgroundColor: theme.textSecondary + '20' }]}>
                    <DDIcon name="x" size={12} color={theme.textSecondary} />
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '600', marginStart: 4 }]}>
                      {t('common.autoApprovalDisabled')}
                    </ThemedText>
                  </DirectionalRow>
                )}
              </View>
            </View>
          </DirectionalRow>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name={source === 'microsoft_ad' ? 'globe' : 'monitor'} size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.source')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>
                {source === 'microsoft_ad' ? t('common.microsoftAD') : t('common.appCreated')}
              </ThemedText>
            </View>
          </DirectionalRow>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="user" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.manager')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>
                {user.managerName || t('common.none')}
              </ThemedText>
              {user.managerId ? (
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 2 }]}>
                  ID: {user.managerId}
                </ThemedText>
              ) : null}
            </View>
          </DirectionalRow>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('visitor.timeline')}
          </ThemedText>

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="calendar" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.createdAt')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>{formatDate(user.createdAt)}</ThemedText>
            </View>
          </DirectionalRow>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <DirectionalRow style={styles.infoRow}>
            <DDIcon name="clock" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginEnd: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.updatedAt')}
              </ThemedText>
              <ThemedText style={[Typography.body, {}]}>{formatDate(user.updatedAt)}</ThemedText>
            </View>
          </DirectionalRow>
        </View>

        <Spacer height={Spacing.xl} />

        {source !== 'microsoft_ad' && (
          <Pressable
            style={[styles.deleteButton, { backgroundColor: theme.error + '15', borderColor: theme.error, flexDirection: getFlexDirection(isRTL) }]}
            onPress={handleDelete}
          >
            <DDIcon name="trash-2" size={18} variant="danger" />
            <ThemedText style={[Typography.body, { color: theme.error, fontWeight: '600', marginEnd: Spacing.sm }]}>
              {t('common.delete')}
            </ThemedText>
          </Pressable>
        )}

        <Spacer height={Spacing.xl} />
      </View>

      <ConfirmationModal
        visible={deleteModalVisible}
        title={t('common.delete')}
        description={t('common.confirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        onSuccess={handleDeleteSuccess}
        successMessage={t('toast.userDeleted')}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  badgeRow: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  infoRow: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  separator: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  autoApprovalValue: {
    marginTop: Spacing.xs,
  },
  enabledBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  retryButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
