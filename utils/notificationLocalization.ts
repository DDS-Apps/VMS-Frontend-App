import { en } from '@/constants/i18n/en';
import { ar } from '@/constants/i18n/ar';
import type { SupportedLocale } from '@/constants/i18n/types';
import type { NotificationParams } from '@/types/notification.types';

export type { NotificationParams };

export interface LocalizedNotification {
  title: string;
  message: string;
}

type NotificationType = 
  | 'request_created'
  | 'request_approved'
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_updated'
  | 'request_modified'
  | 'pending_approval'
  | 'visitor_accepted'
  | 'visitor_rejected'
  | 'visitor_arrival'
  | 'visitor_no_show'
  | 'walk_in_registered'
  | 'check_in'
  | 'check_out'
  | 'reminder_tomorrow'
  | 'reminder_2hours'
  | 'reminder_30min'
  | 'reminder_now'
  | 'expected_today'
  | 'visitor_reminder'
  | 'auto_cancelled'
  | 'room_booked'
  | 'room_reminder'
  | 'room_cancelled'
  | 'room_conflict'
  | 'room_reassigned'
  | 'parking_assigned'
  | 'parking_full'
  | 'buffet_new_request'
  | 'buffet_task_assigned'
  | 'buffet_scheduled'
  | 'buffet_completed'
  | 'buffet_request_created'
  | 'buffet_status_update'
  | 'buffet_staff_update'
  | 'valet_new_request'
  | 'valet_task_assigned'
  | 'valet_scheduled'
  | 'valet_completed'
  | 'valet_cancelled'
  | 'security_access_update'
  | 'security_gate_pass';

const translations = {
  en,
  ar,
};

function interpolate(template: string, params: NotificationParams): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = params[key as keyof NotificationParams];
    return value !== undefined ? String(value) : match;
  });
}

export function localizeNotification(
  type: string,
  params: NotificationParams | undefined | null,
  locale: SupportedLocale,
  fallbackTitle?: string,
  fallbackMessage?: string
): LocalizedNotification {
  const t = translations[locale];
  const templates = t.notifications.templates;

  const notificationType = type as NotificationType;
  const template = templates[notificationType];

  if (!template) {
    return {
      title: fallbackTitle || type,
      message: fallbackMessage || '',
    };
  }

  if (!params || Object.keys(params).length === 0) {
    return {
      title: fallbackTitle || template.title,
      message: fallbackMessage || template.message,
    };
  }

  let title = template.title;
  let message = template.message;

  if (notificationType === 'visitor_reminder' && params.reminderType === 'final') {
    const visitorReminderTemplate = template as typeof templates.visitor_reminder;
    title = visitorReminderTemplate.titleFinal || template.title;
    message = visitorReminderTemplate.messageFinal || template.message;
  }

  if (notificationType === 'request_modified' && params.error) {
    const requestModifiedTemplate = template as typeof templates.request_modified;
    title = requestModifiedTemplate.titleError || template.title;
    message = requestModifiedTemplate.messageError || template.message;
  }

  return {
    title: interpolate(title, params),
    message: interpolate(message, params),
  };
}

export function getLocalizedNotificationTitle(
  type: string,
  params: NotificationParams | undefined | null,
  locale: SupportedLocale,
  fallbackTitle?: string
): string {
  const result = localizeNotification(type, params, locale, fallbackTitle);
  return result.title;
}

export function getLocalizedNotificationMessage(
  type: string,
  params: NotificationParams | undefined | null,
  locale: SupportedLocale,
  fallbackMessage?: string
): string {
  const result = localizeNotification(type, params, locale, undefined, fallbackMessage);
  return result.message;
}
