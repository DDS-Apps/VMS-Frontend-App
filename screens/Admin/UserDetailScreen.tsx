import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DDIcon } from '@/components/DDIcon';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Spacer from '@/components/Spacer';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/contexts/ToastContext';
import { useUserQuery, useDeleteUserMutation } from '@/hooks/queries/useUserQueries';
import { useFormatters } from '@/hooks/useFormatters';
import { UserRole } from '@/types/vms.types';

type RootStackParamList = {
  UserDetail: { userId: string };
  UsersRoles: undefined;
};

type UserDetailRouteProp = RouteProp<RootStackParamList, 'UserDetail'>;
type UserDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function UserDetailScreen() {
  const { theme } = useTheme();
  const { t, isRTL } = useTranslation();
  const { formatDate: fmtDate } = useFormatters();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<UserDetailNavigationProp>();
  const route = useRoute<UserDetailRouteProp>();
  const { showError, showSuccess } = useToast();

  const { userId } = route.params;

  const { data: user, isLoading, isFetching, isError, error, refetch } = useUserQuery(userId);
  const deleteMutation = useDeleteUserMutation();

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

  const handleDelete = async () => {
    const performDelete = async () => {
      try {
        await deleteMutation.mutateAsync(userId);
        showSuccess(t('toast.successTitle'), t('toast.userDeleted'));
        navigation.goBack();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t('toast.unknownError');
        showError(t('toast.errorTitle'), errorMessage);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${t('common.delete')}\n\n${t('common.confirm')}`);
      if (confirmed) {
        await performDelete();
      }
    } else {
      Alert.alert(
        t('common.delete'),
        t('common.confirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
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
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
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
  const source = user.azureAdId ? 'microsoft_ad' : 'app_created';

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
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: theme.primary + '20' }]}>
              <ThemedText style={[Typography.caption, { color: theme.primary, fontWeight: '600' }]}>
                {getRoleLabel(user.role)}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: user.isActive ? theme.success + '20' : theme.error + '20' }]}>
              <DDIcon 
                name={user.isActive ? 'check-circle' : 'x-circle'} 
                size={12} 
                color={user.isActive ? theme.success : theme.error} 
              />
              <ThemedText style={[Typography.caption, { color: user.isActive ? theme.success : theme.error, fontWeight: '600', marginStart: 4 }]}>
                {user.isActive ? t('common.active') : t('common.inactive')}
              </ThemedText>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('common.viewDetails')}
          </ThemedText>

          <View style={styles.infoRow}>
            <DDIcon name="user" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('form.fullName')}
              </ThemedText>
              <ThemedText style={Typography.body}>{userName}</ThemedText>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <DDIcon name="mail" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('form.email')}
              </ThemedText>
              <ThemedText style={Typography.body}>{user.email}</ThemedText>
            </View>
          </View>

          {userPhone ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <DDIcon name="phone" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.phone')}
                  </ThemedText>
                  <ThemedText style={Typography.body}>{userPhone}</ThemedText>
                </View>
              </View>
            </>
          ) : null}

          {user.department ? (
            <>
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                <DDIcon name="briefcase" size={18} variant="muted" />
                <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
                  <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                    {t('form.company')}
                  </ThemedText>
                  <ThemedText style={Typography.body}>{user.department}</ThemedText>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('settings.title')}
          </ThemedText>

          <View style={styles.infoRow}>
            <DDIcon name="shield" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.role')}
              </ThemedText>
              <ThemedText style={Typography.body}>{getRoleLabel(user.role)}</ThemedText>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <DDIcon name="check-circle" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.autoApproval')}
              </ThemedText>
              <View style={styles.autoApprovalValue}>
                {user.canBypassApproval ? (
                  <View style={[styles.enabledBadge, { backgroundColor: theme.success + '20' }]}>
                    <DDIcon name="check" size={12} color={theme.success} />
                    <ThemedText style={[Typography.caption, { color: theme.success, fontWeight: '600', marginStart: 4 }]}>
                      {t('common.enableAuto')}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.enabledBadge, { backgroundColor: theme.textSecondary + '20' }]}>
                    <DDIcon name="x" size={12} color={theme.textSecondary} />
                    <ThemedText style={[Typography.caption, { color: theme.textSecondary, fontWeight: '600', marginStart: 4 }]}>
                      {t('common.disableAuto')}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <DDIcon name={source === 'microsoft_ad' ? 'globe' : 'monitor'} size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.source')}
              </ThemedText>
              <ThemedText style={Typography.body}>
                {source === 'microsoft_ad' ? t('common.microsoftAD') : t('common.appCreated')}
              </ThemedText>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.lg} />

        <View style={[styles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.md }]}>
            {t('visitor.timeline')}
          </ThemedText>

          <View style={styles.infoRow}>
            <DDIcon name="calendar" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.createdAt')}
              </ThemedText>
              <ThemedText style={Typography.body}>{formatDate(user.createdAt)}</ThemedText>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <DDIcon name="clock" size={18} variant="muted" />
            <View style={[styles.infoContent, { marginStart: Spacing.md }]}>
              <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>
                {t('common.updatedAt')}
              </ThemedText>
              <ThemedText style={Typography.body}>{formatDate(user.updatedAt)}</ThemedText>
            </View>
          </View>
        </View>

        <Spacer height={Spacing.xl} />

        <Pressable
          style={[styles.deleteButton, { backgroundColor: theme.error + '15', borderColor: theme.error }]}
          onPress={handleDelete}
        >
          <DDIcon name="trash-2" size={18} variant="danger" />
          <ThemedText style={[Typography.body, { color: theme.error, fontWeight: '600', marginStart: Spacing.sm }]}>
            {t('common.delete')}
          </ThemedText>
        </Pressable>

        <Spacer height={Spacing.xl} />
      </View>
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
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
