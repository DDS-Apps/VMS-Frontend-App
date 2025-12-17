import { UserRole } from "@/types/vms.types";

export type EmailSummaryFrequency = 'none' | 'daily' | 'weekly';

export interface NotificationEventPreference {
  requestUpdates: boolean;
  visitorArrivals: boolean;
  approvalRequired: boolean;
  buffetTasks: boolean;
  valetTasks: boolean;
  systemAlerts: boolean;
}

export interface UserNotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  emailSummaryFrequency: EmailSummaryFrequency;
  eventPreferences: NotificationEventPreference;
}

export interface UserPreferences {
  userId: string;
  role: UserRole;
  notifications: UserNotificationPreferences;
  lastUpdated: string;
}

const getDefaultEventPreferencesForRole = (role: UserRole): NotificationEventPreference => {
  const basePreferences: NotificationEventPreference = {
    requestUpdates: true,
    visitorArrivals: true,
    approvalRequired: false,
    buffetTasks: false,
    valetTasks: false,
    systemAlerts: true,
  };

  switch (role) {
    case 'employee':
      return {
        ...basePreferences,
        requestUpdates: true,
        visitorArrivals: true,
      };
    case 'manager':
      return {
        ...basePreferences,
        requestUpdates: true,
        visitorArrivals: true,
        approvalRequired: true,
      };
    case 'receptionist':
      return {
        ...basePreferences,
        requestUpdates: true,
        visitorArrivals: true,
      };
    case 'security':
      return {
        ...basePreferences,
        visitorArrivals: true,
        systemAlerts: true,
      };
    case 'buffet_admin':
    case 'buffet_staff':
      return {
        ...basePreferences,
        buffetTasks: true,
      };
    case 'valet_admin':
    case 'valet_driver':
      return {
        ...basePreferences,
        valetTasks: true,
      };
    case 'building_admin':
      return {
        ...basePreferences,
        requestUpdates: true,
        approvalRequired: true,
        buffetTasks: true,
        valetTasks: true,
        systemAlerts: true,
      };
    default:
      return basePreferences;
  }
};

const getDefaultPreferences = (userId: string, role: UserRole): UserPreferences => ({
  userId,
  role,
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    emailSummaryFrequency: 'daily',
    eventPreferences: getDefaultEventPreferencesForRole(role),
  },
  lastUpdated: new Date().toISOString(),
});

let userPreferencesStore: Map<string, UserPreferences> = new Map();

export const getUserPreferences = (userId: string, role: UserRole): UserPreferences => {
  const existing = userPreferencesStore.get(userId);
  if (existing) {
    return existing;
  }
  const defaults = getDefaultPreferences(userId, role);
  userPreferencesStore.set(userId, defaults);
  return defaults;
};

export const updateUserNotificationPreferences = (
  userId: string,
  role: UserRole,
  updates: Partial<UserNotificationPreferences>
): UserPreferences => {
  const current = getUserPreferences(userId, role);
  const updated: UserPreferences = {
    ...current,
    notifications: {
      ...current.notifications,
      ...updates,
      eventPreferences: updates.eventPreferences 
        ? { ...current.notifications.eventPreferences, ...updates.eventPreferences }
        : current.notifications.eventPreferences,
    },
    lastUpdated: new Date().toISOString(),
  };
  userPreferencesStore.set(userId, updated);
  return updated;
};

export const updateEventPreference = (
  userId: string,
  role: UserRole,
  eventKey: keyof NotificationEventPreference,
  enabled: boolean
): UserPreferences => {
  const current = getUserPreferences(userId, role);
  const updated: UserPreferences = {
    ...current,
    notifications: {
      ...current.notifications,
      eventPreferences: {
        ...current.notifications.eventPreferences,
        [eventKey]: enabled,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
  userPreferencesStore.set(userId, updated);
  return updated;
};

export const getRelevantEventTypesForRole = (role: UserRole): (keyof NotificationEventPreference)[] => {
  const commonEvents: (keyof NotificationEventPreference)[] = ['systemAlerts'];
  
  switch (role) {
    case 'employee':
      return ['requestUpdates', 'visitorArrivals', ...commonEvents];
    case 'manager':
      return ['requestUpdates', 'visitorArrivals', 'approvalRequired', ...commonEvents];
    case 'receptionist':
      return ['requestUpdates', 'visitorArrivals', ...commonEvents];
    case 'security':
      return ['visitorArrivals', ...commonEvents];
    case 'buffet_admin':
    case 'buffet_staff':
      return ['buffetTasks', ...commonEvents];
    case 'valet_admin':
    case 'valet_driver':
      return ['valetTasks', ...commonEvents];
    case 'building_admin':
      return ['requestUpdates', 'approvalRequired', 'buffetTasks', 'valetTasks', ...commonEvents];
    default:
      return commonEvents;
  }
};

export const getEventTypeLabel = (eventKey: keyof NotificationEventPreference): string => {
  const labels: Record<keyof NotificationEventPreference, string> = {
    requestUpdates: 'settings.eventRequestUpdates',
    visitorArrivals: 'settings.eventVisitorArrivals',
    approvalRequired: 'settings.eventApprovalRequired',
    buffetTasks: 'settings.eventBuffetTasks',
    valetTasks: 'settings.eventValetTasks',
    systemAlerts: 'settings.eventSystemAlerts',
  };
  return labels[eventKey];
};

export const getEventTypeDescription = (eventKey: keyof NotificationEventPreference): string => {
  const descriptions: Record<keyof NotificationEventPreference, string> = {
    requestUpdates: 'settings.eventRequestUpdatesDesc',
    visitorArrivals: 'settings.eventVisitorArrivalsDesc',
    approvalRequired: 'settings.eventApprovalRequiredDesc',
    buffetTasks: 'settings.eventBuffetTasksDesc',
    valetTasks: 'settings.eventValetTasksDesc',
    systemAlerts: 'settings.eventSystemAlertsDesc',
  };
  return descriptions[eventKey];
};

export const resetUserPreferences = (userId: string): void => {
  userPreferencesStore.delete(userId);
};

export const resetAllPreferences = (): void => {
  userPreferencesStore.clear();
};
