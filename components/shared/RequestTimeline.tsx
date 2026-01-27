import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { DDIcon, type IconName } from "@/components/DDIcon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Spacer from "@/components/Spacer";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import {
  LATER_STAGE_STATUSES,
  VISITOR_ACCEPTED_STATUSES,
  VISITOR_DECLINED_STATUSES,
  AWAITING_VISITOR_STATUSES,
  CHECKED_IN_STATUSES,
  COMPLETED_REQUEST_STATUSES,
} from "@/constants/requestConstants";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";

export type TimelineStepStatus = 'completed' | 'current' | 'pending' | 'error';

export type TimelineActionType = 'accept' | 'reject' | 'check_in' | 'check_out' | 'approve' | 'cancel';

export interface TimelineAction {
  type: TimelineActionType;
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface TimelineStep {
  id: string;
  label: string;
  timestamp?: string;
  status: TimelineStepStatus;
  icon: IconName;
  actions?: TimelineAction[];
}

export type TimelineFlowType = 
  | 'standard'
  | 'walk_in'
  | 'valet_request'
  | 'manager_approval'
  | 'receptionist_checkin'
  | 'security_gate';

export type TimelineRole = 
  | 'employee'
  | 'manager'
  | 'receptionist'
  | 'security'
  | 'admin'
  | 'visitor';

interface RequestTimelineProps {
  steps: TimelineStep[];
  title?: string;
  showTitle?: boolean;
}

export function RequestTimeline({ 
  steps, 
  title,
  showTitle = true 
}: RequestTimelineProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const getStepColor = (status: TimelineStepStatus) => {
    switch (status) {
      case 'completed':
        return theme.success;
      case 'current':
        return theme.primary;
      case 'error':
        return theme.error;
      case 'pending':
      default:
        return theme.textSecondary;
    }
  };

  const getLineColor = (status: TimelineStepStatus, nextStatus?: TimelineStepStatus) => {
    if (status === 'completed' && nextStatus === 'completed') {
      return theme.success;
    }
    if (status === 'completed' && (nextStatus === 'current' || nextStatus === 'error')) {
      return theme.success;
    }
    return theme.border;
  };

  const getActionButtonStyle = (action: TimelineAction) => {
    const baseStyle = {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minWidth: 100,
      gap: Spacing.xs,
    };

    switch (action.type) {
      case 'accept':
      case 'approve':
      case 'check_in':
        return {
          ...baseStyle,
          backgroundColor: '#22C55E',
        };
      case 'reject':
      case 'cancel':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: theme.error,
        };
      case 'check_out':
        return {
          ...baseStyle,
          backgroundColor: theme.primary,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: theme.primary,
        };
    }
  };

  const getActionTextStyle = (action: TimelineAction) => {
    switch (action.type) {
      case 'accept':
      case 'approve':
      case 'check_in':
      case 'check_out':
        return { color: '#FFFFFF', fontWeight: '600' as const };
      case 'reject':
      case 'cancel':
        return { color: theme.error, fontWeight: '600' as const };
      default:
        return { color: '#FFFFFF', fontWeight: '600' as const };
    }
  };

  const getActionIcon = (action: TimelineAction): IconName => {
    switch (action.type) {
      case 'accept':
      case 'approve':
        return 'check';
      case 'reject':
      case 'cancel':
        return 'x';
      case 'check_in':
        return 'log-in';
      case 'check_out':
        return 'log-out';
      default:
        return 'check';
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.surface }]}>
      {showTitle ? (
        <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
          {title || t('request.timeline')}
        </ThemedText>
      ) : null}

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const stepColor = getStepColor(step.status);
        const lineColor = !isLast ? getLineColor(step.status, steps[index + 1]?.status) : theme.border;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isError = step.status === 'error';
        const hasActions = step.actions && step.actions.length > 0;

        const iconColumnEl = (
          <View style={styles.iconColumn}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isCompleted || isCurrent || isError
                    ? stepColor
                    : 'transparent',
                  borderColor: stepColor,
                  borderWidth: isCompleted || isCurrent || isError ? 0 : 2,
                },
              ]}
            >
              <DDIcon
                name={step.icon}
                size={14}
                color={isCompleted || isCurrent || isError ? '#FFFFFF' : stepColor}
              />
            </View>
            {!isLast ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: lineColor },
                ]}
              />
            ) : null}
          </View>
        );

        const renderActionButton = (action: TimelineAction, actionIndex: number) => {
          const iconEl = (
            <DDIcon
              name={getActionIcon(action)}
              size={16}
              color={getActionTextStyle(action).color}
            />
          );
          const textEl = (
            <ThemedText
              style={[
                Typography.bodySmall,
                getActionTextStyle(action),
              ]}
            >
              {action.label}
            </ThemedText>
          );

          return (
            <Pressable
              key={`${step.id}-action-${actionIndex}`}
              onPress={action.onPress}
              disabled={action.disabled || action.isLoading}
              style={({ pressed }) => [
                getActionButtonStyle(action),
                pressed && { opacity: 0.8 },
                action.disabled && { opacity: 0.5 },
              ]}
            >
              {action.isLoading ? (
                <ActivityIndicator 
                  size="small" 
                  color={action.type === 'reject' || action.type === 'cancel' ? theme.error : '#FFFFFF'} 
                />
              ) : (
                <>
                  {iconEl}
                  {textEl}
                </>
              )}
            </Pressable>
          );
        };

        const actionButtons = hasActions 
          ? step.actions!.map((action, actionIndex) => renderActionButton(action, actionIndex))
          : null;

        const contentColumnEl = (
          <View style={[styles.contentColumn]}>
            <ThemedText
              style={[
                Typography.body,
                {
                  fontWeight: isCompleted || isCurrent ? '600' : '400',
                  color: isCompleted || isCurrent || isError ? theme.text : theme.textSecondary,
                  
                  width: '100%',
                },
              ]}
            >
              {step.label}
            </ThemedText>

            {hasActions ? (
              <View style={[styles.actionsContainer, { justifyContent: isRTL ? 'flex-end' : 'flex-start', gap: Spacing.sm }]}>
                {actionButtons}
              </View>
            ) : null}

            <Spacer height={isLast ? 0 : Spacing.lg} />
          </View>
        );

        // Platform-aware RTL handling:
        // - On WEB: Browser's document.dir='rtl' reverses flex layouts automatically
        // - On MOBILE: I18nManager doesn't flip flexDirection, so manually reverse in RTL
        const isWeb = Platform.OS === 'web';
        const shouldReverse = isRTL && !isWeb;

        return (
          <View key={step.id} style={[styles.stepContainer, { flexDirection: 'row' }]}>
            {shouldReverse ? (
              <>
                {contentColumnEl}
                {iconColumnEl}
              </>
            ) : (
              <>
                {iconColumnEl}
                {contentColumnEl}
              </>
            )}
          </View>
        );
      })}
    </ThemedView>
  );
}

export interface TimelineData {
  createdAt: string;
  status: string;
  approval?: {
    requiresApproval: boolean;
    autoApproved?: boolean;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  };
  hostApproval?: {
    required: boolean;
    approvedAt?: string;
    rejectedAt?: string;
  };
  acceptedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  isWalkIn?: boolean;
}

export interface TimelineActionCallbacks {
  onAccept?: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onCancel?: () => void;
  isAcceptLoading?: boolean;
  isRejectLoading?: boolean;
  isApproveLoading?: boolean;
  isCheckInLoading?: boolean;
  isCheckOutLoading?: boolean;
  isCancelLoading?: boolean;
}

interface UseTimelineStepsOptions {
  data: TimelineData;
  role?: TimelineRole;
  flowType?: TimelineFlowType;
  actions?: TimelineActionCallbacks;
  showActions?: boolean;
}

export function useTimelineSteps({
  data,
  role = 'employee',
  flowType = 'standard',
  actions,
  showActions = false,
}: UseTimelineStepsOptions): TimelineStep[] {
  const { t } = useTranslation();
  
  const steps: TimelineStep[] = [];

  if (flowType === 'receptionist_checkin') {
    return buildReceptionistTimeline(data, t, actions, showActions);
  }

  if (flowType === 'manager_approval') {
    return buildManagerApprovalTimeline(data, t, actions, showActions);
  }

  if (flowType === 'security_gate') {
    return buildSecurityTimeline(data, t, actions, showActions);
  }

  return buildStandardTimeline(data, t, actions, showActions, role);
}

function buildStandardTimeline(
  data: TimelineData,
  t: (key: string) => string,
  actions?: TimelineActionCallbacks,
  showActions?: boolean,
  role?: TimelineRole
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Check terminal/current states upfront
  const isCancelled = data.cancelledAt || data.status === 'cancelled';
  const isAutoCancelled = data.status === 'auto_cancelled';
  const isTerminalCancelled = isCancelled || isAutoCancelled;
  const isRejected = data.approval?.rejectedAt || data.status === 'rejected';
  const isHostRejected = data.hostApproval?.rejectedAt || data.status === 'host_reject';
  const isVisitorDeclined = VISITOR_DECLINED_STATUSES.includes(data.status);
  const isAtLaterStage = LATER_STAGE_STATUSES.includes(data.status);
  const isPendingApproval = data.status === 'pending_approval';
  const requiresApproval = data.approval?.requiresApproval || isPendingApproval;
  // Only consider approved if we have approvedAt AND status is not pending_approval (after edit, status resets but old timestamp remains)
  const isApproved = (data.approval?.approvedAt && !isPendingApproval) || (!isPendingApproval && isAtLaterStage);


  // Track if we've hit a terminal/current step - all subsequent steps should be pending
  let reachedTerminalOrCurrent = false;

  // ============ Step 1: Request Submitted (always completed) ============
  steps.push({
    id: 'submitted',
    label: t('timeline.requestSubmitted'),
    timestamp: data.createdAt,
    status: 'completed',
    icon: 'check-circle',
  });

  // ============ Step 2: Manager Approval ============
  // Only show approval step if approval is actually required or was processed
  const shouldShowApprovalStep = requiresApproval || isRejected || isApproved || data.approval?.approvedAt || data.approval?.rejectedAt;
  if (shouldShowApprovalStep) {
    if (isRejected) {
      // Rejected by manager
      steps.push({
        id: 'approval',
        label: t('timeline.rejected'),
        timestamp: data.approval?.rejectedAt,
        status: 'error',
        icon: 'x-circle',
      });
      reachedTerminalOrCurrent = true;
    } else if (isApproved) {
      // Approved
      steps.push({
        id: 'approval',
        label: data.approval?.autoApproved
          ? t('timeline.autoApproved')
          : t('timeline.managerApproved'),
        timestamp: data.approval?.approvedAt,
        status: 'completed',
        icon: 'thumbs-up',
      });
    } else if (!reachedTerminalOrCurrent) {
      // Pending approval (current step)
      const approvalStep: TimelineStep = {
        id: 'approval',
        label: t('timeline.pendingApproval'),
        status: 'current',
        icon: 'clock',
      };

      if (showActions && role === 'manager' && actions?.onApprove) {
        approvalStep.actions = [];
        if (actions.onApprove) {
          approvalStep.actions.push({
            type: 'approve',
            label: t('actions.approve'),
            onPress: actions.onApprove,
            isLoading: actions.isApproveLoading,
          });
        }
        if (actions.onReject) {
          approvalStep.actions.push({
            type: 'reject',
            label: t('actions.reject'),
            onPress: actions.onReject,
            isLoading: actions.isRejectLoading,
          });
        }
      }

      steps.push(approvalStep);
      reachedTerminalOrCurrent = true;
    } else {
      // Already passed a terminal/current step
      steps.push({
        id: 'approval',
        label: t('timeline.managerApproved'),
        status: 'pending',
        icon: 'thumbs-up',
      });
    }
  }

  // ============ Step 2b: Host Approval (if required) ============
  if (data.hostApproval?.required) {
    if (isHostRejected) {
      steps.push({
        id: 'host_approval',
        label: t('timeline.hostRejected'),
        timestamp: data.hostApproval.rejectedAt,
        status: 'error',
        icon: 'x-circle',
      });
      reachedTerminalOrCurrent = true;
    } else if (data.hostApproval.approvedAt) {
      steps.push({
        id: 'host_approval',
        label: t('timeline.hostApproved'),
        timestamp: data.hostApproval.approvedAt,
        status: 'completed',
        icon: 'user-check',
      });
    } else if (!reachedTerminalOrCurrent) {
      const hostStep: TimelineStep = {
        id: 'host_approval',
        label: t('timeline.pendingHostApproval'),
        status: 'current',
        icon: 'clock',
      };

      if (showActions && role === 'employee' && actions) {
        hostStep.actions = [];
        if (actions.onAccept) {
          hostStep.actions.push({
            type: 'accept',
            label: t('actions.accept'),
            onPress: actions.onAccept,
            isLoading: actions.isAcceptLoading,
          });
        }
        if (actions.onReject) {
          hostStep.actions.push({
            type: 'reject',
            label: t('actions.reject'),
            onPress: actions.onReject,
            isLoading: actions.isRejectLoading,
          });
        }
      }

      steps.push(hostStep);
      reachedTerminalOrCurrent = true;
    } else {
      steps.push({
        id: 'host_approval',
        label: t('timeline.pendingHostApproval'),
        status: 'pending',
        icon: 'clock',
      });
    }
  } else if (isHostRejected) {
    // Host rejected without hostApproval object
    steps.push({
      id: 'host_approval',
      label: t('timeline.hostRejected'),
      status: 'error',
      icon: 'x-circle',
    });
    reachedTerminalOrCurrent = true;
  }

  // ============ Step 3: Visitor Accepted ============
  // Show visitor response step as pending if manager already rejected
  if (isRejected) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorAccepted'),
      status: 'pending',
      icon: 'user-check',
    });
  } else if (isVisitorDeclined) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorDeclined'),
      timestamp: data.acceptedAt,
      status: 'error',
      icon: 'x-circle',
    });
    reachedTerminalOrCurrent = true;
  } else if (isTerminalCancelled && !data.acceptedAt) {
    // Cancelled before visitor accepted - show cancelled here
    steps.push({
      id: 'visitor_response',
      label: isCancelled ? t('timeline.cancelled') : t('timeline.autoCancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    reachedTerminalOrCurrent = true;
  } else if (VISITOR_ACCEPTED_STATUSES.includes(data.status) || data.acceptedAt) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorAccepted'),
      timestamp: data.acceptedAt,
      status: 'completed',
      icon: 'user-check',
    });
  } else if (!reachedTerminalOrCurrent && AWAITING_VISITOR_STATUSES.includes(data.status)) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.awaitingVisitor'),
      status: 'current',
      icon: 'clock',
    });
    reachedTerminalOrCurrent = true;
  } else {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorAccepted'),
      status: 'pending',
      icon: 'user-check',
    });
  }

  // ============ Step 4: Visitor Checked In ============
  // Show check-in step as pending if manager already rejected
  if (isRejected) {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: 'pending',
      icon: 'log-in',
    });
  } else if (CHECKED_IN_STATUSES.includes(data.status) || data.checkedInAt) {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      timestamp: data.checkedInAt,
      status: 'completed',
      icon: 'log-in',
    });
  } else if (isTerminalCancelled && data.acceptedAt && !data.checkedInAt) {
    // Cancelled after acceptance but before check-in
    steps.push({
      id: 'checked_in',
      label: isCancelled ? t('timeline.cancelled') : t('timeline.autoCancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    reachedTerminalOrCurrent = true;
  } else if (!reachedTerminalOrCurrent && showActions && (role === 'receptionist' || role === 'security') && actions?.onCheckIn) {
    const checkInStep: TimelineStep = {
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: 'current',
      icon: 'log-in',
      actions: [{
        type: 'check_in',
        label: t('actions.checkIn'),
        onPress: actions.onCheckIn,
        isLoading: actions.isCheckInLoading,
      }],
    };
    steps.push(checkInStep);
    reachedTerminalOrCurrent = true;
  } else {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: 'pending',
      icon: 'log-in',
    });
  }

  // ============ Step 5: Visit Completed ============
  // Show completed step as pending if manager already rejected
  if (isRejected) {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      status: 'pending',
      icon: 'check-circle',
    });
  } else if (COMPLETED_REQUEST_STATUSES.includes(data.status) || data.completedAt || data.checkedOutAt) {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      timestamp: data.completedAt || data.checkedOutAt,
      status: 'completed',
      icon: 'check-circle',
    });
  } else if (!reachedTerminalOrCurrent && showActions && data.checkedInAt && (role === 'receptionist' || role === 'security') && actions?.onCheckOut) {
    const completeStep: TimelineStep = {
      id: 'completed',
      label: t('timeline.visitCompleted'),
      status: 'current',
      icon: 'check-circle',
      actions: [{
        type: 'check_out',
        label: t('actions.checkOut'),
        onPress: actions.onCheckOut,
        isLoading: actions.isCheckOutLoading,
      }],
    };
    steps.push(completeStep);
  } else {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      status: 'pending',
      icon: 'check-circle',
    });
  }

  return steps;
}

function buildReceptionistTimeline(
  data: TimelineData,
  t: (key: string) => string,
  actions?: TimelineActionCallbacks,
  showActions?: boolean
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  const isScheduled = !data.isWalkIn;

  if (isScheduled) {
    steps.push({
      id: 'scheduled',
      label: t('timeline.visitorScheduled'),
      timestamp: data.createdAt,
      status: 'completed',
      icon: 'calendar',
    });
  } else {
    steps.push({
      id: 'walk_in',
      label: t('timeline.walkInArrived'),
      timestamp: data.createdAt,
      status: 'completed',
      icon: 'user-plus',
    });
  }

  // Check for cancelled status (with or without timestamp)
  if (data.cancelledAt || data.status === 'cancelled' || data.status === 'auto_cancelled') {
    steps.push({
      id: 'cancelled',
      label: data.status === 'auto_cancelled' ? t('timeline.autoCancelled') : t('timeline.cancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  // Check for rejected status
  const isRejected = data.status === 'rejected' || data.approval?.rejectedAt || data.hostApproval?.rejectedAt;
  if (isRejected) {
    const isManagerRejection = data.approval?.rejectedAt && !data.hostApproval?.rejectedAt;
    steps.push({
      id: isManagerRejection ? 'manager_rejected' : 'host_rejected',
      label: isManagerRejection ? t('timeline.rejected') : t('timeline.hostRejected'),
      timestamp: data.approval?.rejectedAt || data.hostApproval?.rejectedAt,
      status: 'error',
      icon: 'x-circle',
    });
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: 'pending',
      icon: 'log-in',
    });
    steps.push({
      id: 'checked_out',
      label: t('timeline.visitorCheckedOut'),
      status: 'pending',
      icon: 'log-out',
    });
    return steps;
  }

  // Check if visitor has checked in - either by timestamp or by status
  const isCheckedIn = data.checkedInAt || data.status === 'checked_in' || data.status === 'completed';
  // Check if visitor has checked out / visit completed - either by timestamp or by status
  const isCheckedOut = data.completedAt || data.checkedOutAt || data.status === 'completed';

  if (isCheckedIn) {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      timestamp: data.checkedInAt,
      status: 'completed',
      icon: 'log-in',
    });

    if (isCheckedOut) {
      steps.push({
        id: 'checked_out',
        label: t('timeline.visitorCheckedOut'),
        timestamp: data.completedAt || data.checkedOutAt,
        status: 'completed',
        icon: 'log-out',
      });
    } else {
      const checkOutStep: TimelineStep = {
        id: 'checked_out',
        label: t('timeline.visitorCheckedOut'),
        status: showActions && actions?.onCheckOut ? 'current' : 'pending',
        icon: 'log-out',
      };

      if (showActions && actions?.onCheckOut) {
        checkOutStep.actions = [{
          type: 'check_out',
          label: t('actions.checkOut'),
          onPress: actions.onCheckOut,
          isLoading: actions.isCheckOutLoading,
        }];
      }

      steps.push(checkOutStep);
    }
  } else {
    const checkInStep: TimelineStep = {
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: showActions && actions?.onCheckIn ? 'current' : 'pending',
      icon: 'log-in',
    };

    if (showActions && actions?.onCheckIn) {
      checkInStep.actions = [{
        type: 'check_in',
        label: t('actions.checkIn'),
        onPress: actions.onCheckIn,
        isLoading: actions.isCheckInLoading,
      }];
    }

    steps.push(checkInStep);

    steps.push({
      id: 'checked_out',
      label: t('timeline.visitorCheckedOut'),
      status: 'pending',
      icon: 'log-out',
    });
  }

  // ============ Visit Completed Step ============
  if (data.completedAt || data.checkedOutAt || data.status === 'completed') {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      timestamp: data.completedAt || data.checkedOutAt,
      status: 'completed',
      icon: 'check-circle',
    });
  } else {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      status: 'pending',
      icon: 'check-circle',
    });
  }

  return steps;
}

function buildManagerApprovalTimeline(
  data: TimelineData,
  t: (key: string) => string,
  actions?: TimelineActionCallbacks,
  showActions?: boolean
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  steps.push({
    id: 'submitted',
    label: t('timeline.requestSubmitted'),
    timestamp: data.createdAt,
    status: 'completed',
    icon: 'send',
  });

  // Check for rejected status (with or without timestamp)
  if (data.approval?.rejectedAt || data.status === 'rejected') {
    steps.push({
      id: 'approval',
      label: t('timeline.rejected'),
      timestamp: data.approval?.rejectedAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  // Check for cancelled status in manager timeline
  if (data.cancelledAt || data.status === 'cancelled' || data.status === 'auto_cancelled') {
    steps.push({
      id: 'cancelled',
      label: data.status === 'auto_cancelled' ? t('timeline.autoCancelled') : t('timeline.cancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  // Check for host rejection status (with or without timestamp)
  if (data.hostApproval?.rejectedAt || data.status === 'host_reject') {
    steps.push({
      id: 'host_approval',
      label: t('timeline.hostRejected'),
      timestamp: data.hostApproval?.rejectedAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  // Check for visitor rejection status
  if (data.status === 'visitor_rejected') {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorDeclined'),
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  // Only show approved if approvedAt exists AND status is not pending_approval (after edit, status resets but old timestamp remains)
  const isPendingApproval = data.status === 'pending_approval';
  if (data.approval?.approvedAt && !isPendingApproval) {
    steps.push({
      id: 'approval',
      label: t('timeline.managerApproved'),
      timestamp: data.approval.approvedAt,
      status: 'completed',
      icon: 'check-circle',
    });

    steps.push({
      id: 'next_steps',
      label: t('timeline.awaitingVisitor'),
      status: 'current',
      icon: 'clock',
    });
  } else {
    const approvalStep: TimelineStep = {
      id: 'approval',
      label: t('timeline.pendingApproval'),
      status: 'current',
      icon: 'clock',
    };

    if (showActions && actions) {
      approvalStep.actions = [];
      if (actions.onApprove) {
        approvalStep.actions.push({
          type: 'approve',
          label: t('actions.approve'),
          onPress: actions.onApprove,
          isLoading: actions.isApproveLoading,
        });
      }
      if (actions.onReject) {
        approvalStep.actions.push({
          type: 'reject',
          label: t('actions.reject'),
          onPress: actions.onReject,
          isLoading: actions.isRejectLoading,
        });
      }
    }

    steps.push(approvalStep);
  }

  return steps;
}

function buildSecurityTimeline(
  data: TimelineData,
  t: (key: string) => string,
  actions?: TimelineActionCallbacks,
  showActions?: boolean
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  steps.push({
    id: 'arrival',
    label: t('timeline.visitorArrived'),
    timestamp: data.createdAt,
    status: 'completed',
    icon: 'user',
  });

  // Check for cancelled status in security timeline
  if (data.cancelledAt || data.status === 'cancelled' || data.status === 'auto_cancelled') {
    steps.push({
      id: 'cancelled',
      label: data.status === 'auto_cancelled' ? t('timeline.autoCancelled') : t('timeline.cancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  if (data.checkedInAt) {
    steps.push({
      id: 'verified',
      label: t('timeline.identityVerified'),
      timestamp: data.checkedInAt,
      status: 'completed',
      icon: 'shield',
    });

    steps.push({
      id: 'entry',
      label: t('timeline.entryGranted'),
      timestamp: data.checkedInAt,
      status: 'completed',
      icon: 'log-in',
    });

    if (data.completedAt || data.checkedOutAt) {
      steps.push({
        id: 'exit',
        label: t('timeline.exitRecorded'),
        timestamp: data.completedAt || data.checkedOutAt,
        status: 'completed',
        icon: 'log-out',
      });
    } else {
      const exitStep: TimelineStep = {
        id: 'exit',
        label: t('timeline.exitRecorded'),
        status: showActions && actions?.onCheckOut ? 'current' : 'pending',
        icon: 'log-out',
      };

      if (showActions && actions?.onCheckOut) {
        exitStep.actions = [{
          type: 'check_out',
          label: t('actions.recordExit'),
          onPress: actions.onCheckOut,
          isLoading: actions.isCheckOutLoading,
        }];
      }

      steps.push(exitStep);
    }
  } else {
    const verifyStep: TimelineStep = {
      id: 'verified',
      label: t('timeline.identityVerified'),
      status: showActions && actions?.onCheckIn ? 'current' : 'pending',
      icon: 'shield',
    };

    if (showActions && actions?.onCheckIn) {
      verifyStep.actions = [{
        type: 'check_in',
        label: t('actions.verifyAndCheckIn'),
        onPress: actions.onCheckIn,
        isLoading: actions.isCheckInLoading,
      }];
    }

    steps.push(verifyStep);

    steps.push({
      id: 'entry',
      label: t('timeline.entryGranted'),
      status: 'pending',
      icon: 'log-in',
    });

    steps.push({
      id: 'exit',
      label: t('timeline.exitRecorded'),
      status: 'pending',
      icon: 'log-out',
    });
  }

  return steps;
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconColumn: {
    alignItems: 'center',
    width: 28,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  contentColumn: {
    flex: 1,
    paddingTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
});
