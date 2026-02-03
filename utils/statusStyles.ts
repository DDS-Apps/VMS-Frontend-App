import type { Theme, StatusConfig } from "@/types/theme.types";
import { BrandColors, StatusColors } from "@/constants/theme";

export type { StatusConfig };

/**
 * Safely apply opacity to a hex color
 * @param color Hex color string (e.g., '#F58423')
 * @param alpha Opacity value as 2-digit hex (e.g., '10' for ~6% opacity, '15' for ~8%, 'FF' for 100%)
 * @returns Color with opacity in #RRGGBBAA format
 */
export const applyOpacity = (color: string, alpha: string): string => {
  if (!color || !color.startsWith('#')) {
    console.warn(`Invalid color provided to applyOpacity: ${color}, using fallback #808080`);
    return `#808080${alpha}`;
  }
  
  const hexColor = color.replace('#', '');
  
  if (hexColor.length === 3) {
    const expanded = hexColor.split('').map(char => char + char).join('');
    return `#${expanded}${alpha}`;
  }
  
  if (hexColor.length === 6) {
    return `#${hexColor}${alpha}`;
  }
  
  console.warn(`Invalid hex color length: ${color}, using fallback #808080`);
  return `#808080${alpha}`;
};

/**
 * Map status code to i18n translation key
 */
export const getStatusTranslationKey = (status: string): string => {
  if (!status) {
    return 'status.pending';
  }
  switch (status.toLowerCase()) {
    case 'pending_approval':
      return 'status.pendingApproval';
    case 'pending_host_approval':
      return 'status.pendingHostApproval';
    case 'approved':
      return 'status.approved';
    case 'visitor_accepted':
      return 'status.visitorAccepted';
    case 'checked_in':
      return 'status.checkedIn';
    case 'checked_out':
      return 'status.checkedOut';
    case 'completed':
      return 'timeline.visitCompleted';
    case 'rejected':
      return 'status.rejected';
    case 'visitor_rejected':
      return 'status.visitorRejected';
    case 'cancelled':
      return 'status.cancelled';
    case 'auto_cancelled':
      return 'status.autoCancelled';
    case 'pending':
      return 'status.pending';
    case 'in_progress':
      return 'status.inProgress';
    case 'scheduled':
      return 'status.scheduled';
    case 'waiting_on_visitor':
      return 'status.waitingOnVisitor';
    case 'visitor_pending':
      return 'status.visitorPending';
    case 'preparing':
      return 'status.preparing';
    case 'ready':
      return 'status.ready';
    case 'served':
      return 'status.served';
    case 'assigned':
      return 'status.assigned';
    case 'parked':
      return 'parking.parked';
    case 'ready_for_pickup':
      return 'valet.readyForPickup';
    case 'expected':
      return 'status.expected';
    default:
      return `status.${status}`;
  }
};

/**
 * Get theme-aware status configuration for visitor request statuses
 * Uses Dallah Albaraka brand colors (Orange/Green/Grey)
 * @param theme - The current theme
 * @param status - The status code
 * @param t - Optional translation function. If provided, label will be translated.
 */
export const getStatusConfig = (theme: Theme, status: string, t?: (key: string) => string): StatusConfig => {
  const safeStatus = status || 'pending';
  const translationKey = getStatusTranslationKey(safeStatus);
  const fallbackLabel = safeStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const label = t ? t(translationKey) : fallbackLabel;

  switch (safeStatus.toLowerCase()) {
    case 'pending_approval':
    case 'pending_host_approval':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '40'),
        borderColor: StatusColors.warning,
        label,
        icon: 'clock'
      };
    case 'approved':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label,
        icon: 'check-circle'
      };
    case 'visitor_accepted':
      return {
        bg: applyOpacity(BrandColors.brandGreen, '15'),
        text: BrandColors.brandGreen,
        border: applyOpacity(BrandColors.brandGreen, '30'),
        borderColor: BrandColors.brandGreen,
        label,
        icon: 'check-circle'
      };
    case 'checked_in':
      return {
        bg: applyOpacity(BrandColors.brandGreen, '20'),
        text: BrandColors.brandGreen,
        border: applyOpacity(BrandColors.brandGreen, '40'),
        borderColor: BrandColors.brandGreen,
        label,
        icon: 'log-in'
      };
    case 'checked_out':
      return {
        bg: applyOpacity(theme.textSecondary, '15'),
        text: theme.textSecondary,
        border: applyOpacity(theme.textSecondary, '30'),
        borderColor: theme.textSecondary,
        label,
        icon: 'log-out'
      };
    case 'completed':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label,
        icon: 'check-circle'
      };
    case 'rejected':
    case 'visitor_rejected':
      return {
        bg: applyOpacity(StatusColors.error, '15'),
        text: StatusColors.error,
        border: applyOpacity(StatusColors.error, '30'),
        borderColor: StatusColors.error,
        label,
        icon: 'x-circle'
      };
    case 'cancelled':
    case 'auto_cancelled':
      return {
        bg: applyOpacity(StatusColors.error, '15'),
        text: StatusColors.error,
        border: applyOpacity(StatusColors.error, '30'),
        borderColor: StatusColors.error,
        label,
        icon: 'x-circle'
      };
    case 'visitor_pending':
    case 'waiting_on_visitor':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label,
        icon: 'clock'
      };
    case 'pending':
      return {
        bg: applyOpacity(BrandColors.brandOrange, '15'),
        text: BrandColors.brandOrange,
        border: applyOpacity(BrandColors.brandOrange, '30'),
        borderColor: BrandColors.brandOrange,
        label,
        icon: 'clock'
      };
    case 'in_progress':
    case 'preparing':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label,
        icon: 'loader'
      };
    case 'ready':
      return {
        bg: applyOpacity(BrandColors.brandGreen, '15'),
        text: BrandColors.brandGreen,
        border: applyOpacity(BrandColors.brandGreen, '30'),
        borderColor: BrandColors.brandGreen,
        label,
        icon: 'check'
      };
    case 'served':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label,
        icon: 'check-circle'
      };
    case 'expected':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label,
        icon: 'clock'
      };
    case 'assigned':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label,
        icon: 'user-check'
      };
    case 'parked':
      return {
        bg: applyOpacity(StatusColors.info, '15'),
        text: StatusColors.info,
        border: applyOpacity(StatusColors.info, '30'),
        borderColor: StatusColors.info,
        label,
        icon: 'parking'
      };
    case 'ready_for_pickup':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label,
        icon: 'car'
      };
    default:
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
        border: theme.border,
        borderColor: theme.textSecondary,
        label,
        icon: 'clock'
      };
  }
};

/**
 * Get simplified status variant for visitor check-in statuses
 * Uses Dallah Albaraka brand colors (Orange/Green/Grey)
 */
export const getStatusVariant = (status: string): { bgColor: string; textColor: string } => {
  switch (status.toLowerCase()) {
    case 'pending':
      return {
        bgColor: applyOpacity(StatusColors.warning, '15'),
        textColor: StatusColors.warning,
      };
    case 'checked_in':
      return {
        bgColor: applyOpacity(BrandColors.brandGreen, '15'),
        textColor: BrandColors.brandGreen,
      };
    case 'in_progress':
      return {
        bgColor: applyOpacity(BrandColors.brandOrange, '15'),
        textColor: BrandColors.brandOrange,
      };
    case 'completed':
      return {
        bgColor: applyOpacity(StatusColors.success, '15'),
        textColor: StatusColors.success,
      };
    default:
      return {
        bgColor: applyOpacity(BrandColors.brandGrey80, '15'),
        textColor: BrandColors.brandGrey80,
      };
  }
};

/**
 * Create theme-aware modal overlay style
 */
export const createModalOverlayStyle = (theme: Theme, opacity: '50' | '60' = '50') => ({
  backgroundColor: applyOpacity(theme.overlay, opacity),
});

/**
 * Get badge colors for different status types
 * Uses Dallah Albaraka color palette (Orange/Green/Grey)
 */
export const getBadgeColors = (type: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary') => {
  switch (type) {
    case 'primary':
      return {
        bg: applyOpacity(BrandColors.brandOrange, '15'),
        text: BrandColors.brandOrange,
      };
    case 'secondary':
      return {
        bg: applyOpacity(BrandColors.brandGreen, '15'),
        text: BrandColors.brandGreen,
      };
    case 'success':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
      };
    case 'warning':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
      };
    case 'error':
      return {
        bg: applyOpacity(StatusColors.error, '15'),
        text: StatusColors.error,
      };
    case 'info':
    default:
      return {
        bg: applyOpacity(BrandColors.brandOrange, '15'),
        text: BrandColors.brandOrange,
      };
  }
};
