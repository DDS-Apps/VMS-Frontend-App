import type { Theme, StatusConfig } from "@/types/theme.types";
import { BrandColors, StatusColors } from "@/constants/theme";

export type { StatusConfig };

/**
 * Safely apply opacity to a hex color
 * @param color Hex color string (e.g., '#307BF2')
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
      return 'status.completed';
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
    default:
      return `status.${status}`;
  }
};

/**
 * Get theme-aware status configuration for visitor request statuses
 * Uses DALLAH DIGITAL brand colors
 * @param theme - The current theme
 * @param status - The status code
 * @param t - Optional translation function. If provided, label will be translated.
 */
export const getStatusConfig = (theme: Theme, status: string, t?: (key: string) => string): StatusConfig => {
  const translationKey = getStatusTranslationKey(status);
  const fallbackLabel = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const label = t ? t(translationKey) : fallbackLabel;

  switch (status.toLowerCase()) {
    case 'pending_approval':
    case 'pending_host_approval':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '40'),
        borderColor: StatusColors.warning,
        label
      };
    case 'approved':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label
      };
    case 'visitor_accepted':
      return {
        bg: applyOpacity(BrandColors.brandBlue, '15'),
        text: BrandColors.brandBlue,
        border: applyOpacity(BrandColors.brandBlue, '30'),
        borderColor: BrandColors.brandBlue,
        label
      };
    case 'checked_in':
      return {
        bg: applyOpacity(BrandColors.brandTeal, '20'),
        text: BrandColors.brandTeal,
        border: applyOpacity(BrandColors.brandTeal, '40'),
        borderColor: BrandColors.brandTeal,
        label
      };
    case 'completed':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label
      };
    case 'rejected':
    case 'visitor_rejected':
      return {
        bg: applyOpacity(StatusColors.error, '15'),
        text: StatusColors.error,
        border: applyOpacity(StatusColors.error, '30'),
        borderColor: StatusColors.error,
        label
      };
    case 'cancelled':
    case 'auto_cancelled':
      return {
        bg: applyOpacity(StatusColors.error, '15'),
        text: StatusColors.error,
        border: applyOpacity(StatusColors.error, '30'),
        borderColor: StatusColors.error,
        label
      };
    case 'visitor_pending':
    case 'waiting_on_visitor':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label
      };
    case 'pending':
      return {
        bg: applyOpacity(BrandColors.brandBlue, '15'),
        text: BrandColors.brandBlue,
        border: applyOpacity(BrandColors.brandBlue, '30'),
        borderColor: BrandColors.brandBlue,
        label
      };
    case 'in_progress':
    case 'preparing':
      return {
        bg: applyOpacity(StatusColors.warning, '15'),
        text: StatusColors.warning,
        border: applyOpacity(StatusColors.warning, '30'),
        borderColor: StatusColors.warning,
        label
      };
    case 'ready':
      return {
        bg: applyOpacity(BrandColors.brandTeal, '15'),
        text: BrandColors.brandTeal,
        border: applyOpacity(BrandColors.brandTeal, '30'),
        borderColor: BrandColors.brandTeal,
        label
      };
    case 'served':
      return {
        bg: applyOpacity(StatusColors.success, '15'),
        text: StatusColors.success,
        border: applyOpacity(StatusColors.success, '30'),
        borderColor: StatusColors.success,
        label
      };
    default:
      return {
        bg: theme.surfaceSecondary,
        text: theme.textSecondary,
        border: theme.border,
        borderColor: theme.textSecondary,
        label
      };
  }
};

/**
 * Get simplified status variant for visitor check-in statuses
 * Uses DALLAH DIGITAL brand colors
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
        bgColor: applyOpacity(BrandColors.brandTeal, '15'),
        textColor: BrandColors.brandTeal,
      };
    case 'in_progress':
      return {
        bgColor: applyOpacity(BrandColors.brandBlue, '15'),
        textColor: BrandColors.brandBlue,
      };
    case 'completed':
      return {
        bgColor: applyOpacity(StatusColors.success, '15'),
        textColor: StatusColors.success,
      };
    default:
      return {
        bgColor: '#52617815',
        textColor: '#526178',
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
 * Uses DALLAH DIGITAL color palette
 */
export const getBadgeColors = (type: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary') => {
  switch (type) {
    case 'primary':
      return {
        bg: applyOpacity(BrandColors.brandBlue, '15'),
        text: BrandColors.brandBlue,
      };
    case 'secondary':
      return {
        bg: applyOpacity(BrandColors.brandTeal, '15'),
        text: BrandColors.brandTeal,
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
        bg: applyOpacity(BrandColors.brandBlue, '15'),
        text: BrandColors.brandBlue,
      };
  }
};
