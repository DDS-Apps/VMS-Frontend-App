import React from "react";
import { View, StyleSheet, I18nManager } from "react-native";
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
import { useFormatters } from "@/hooks/useFormatters";

export interface TimelineStep {
  id: string;
  label: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: IconName;
}

interface VisitTimelineProps {
  steps: TimelineStep[];
}

export function VisitTimeline({ steps }: VisitTimelineProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();

  const getStepColor = (status: TimelineStep['status']) => {
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

  const getLineColor = (status: TimelineStep['status'], nextStatus?: TimelineStep['status']) => {
    if (status === 'completed' && nextStatus === 'completed') {
      return theme.success;
    }
    if (status === 'completed' && (nextStatus === 'current' || nextStatus === 'error')) {
      return theme.success;
    }
    return theme.border;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.surface }]}>
      <ThemedText style={[Typography.subtitle, { fontWeight: '600', marginBottom: Spacing.lg }]}>
        {t('request.timeline')}
      </ThemedText>

      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const stepColor = getStepColor(step.status);
        const lineColor = !isLast ? getLineColor(step.status, steps[index + 1]?.status) : theme.border;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isError = step.status === 'error';

        return (
          <View key={step.id} style={styles.stepContainer}>
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

            <View style={styles.contentColumn}>
              <ThemedText
                style={[
                  Typography.body,
                  {
                    fontWeight: isCompleted || isCurrent ? '600' : '400',
                    color: isCompleted || isCurrent || isError ? theme.text : theme.textSecondary,
                  },
                ]}
              >
                {step.label}
              </ThemedText>
              {step.timestamp ? (
                <ThemedText
                  style={[
                    Typography.caption,
                    { color: theme.textSecondary, marginTop: 2 },
                  ]}
                >
                  {formatDateTime(new Date(step.timestamp))}
                </ThemedText>
              ) : null}
              <Spacer height={isLast ? 0 : Spacing.lg} />
            </View>
          </View>
        );
      })}
    </ThemedView>
  );
}

export interface VisitTimelineData {
  createdAt: string;
  status: string;
  approval?: {
    requiresApproval: boolean;
    autoApproved: boolean;
    approvedAt?: string;
    rejectedAt?: string;
  };
  acceptedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export function useVisitTimelineSteps(data: VisitTimelineData): TimelineStep[] {
  const { t } = useTranslation();

  const steps: TimelineStep[] = [];

  steps.push({
    id: 'submitted',
    label: t('timeline.requestSubmitted'),
    timestamp: data.createdAt,
    status: 'completed',
    icon: 'check-circle',
  });

  const isAtLaterStage = LATER_STAGE_STATUSES.includes(data.status);

  // Check if request was rejected (with or without timestamp)
  const isRejectedStatus = data.status === 'rejected';
  
  if (data.approval) {
    if (data.approval.rejectedAt || isRejectedStatus) {
      steps.push({
        id: 'approval',
        label: t('timeline.rejected'),
        timestamp: data.approval.rejectedAt,
        status: 'error',
        icon: 'x-circle',
      });
      return steps;
    } else if (data.approval.approvedAt || isAtLaterStage) {
      steps.push({
        id: 'approval',
        label: data.approval.autoApproved
          ? t('timeline.autoApproved')
          : t('timeline.managerApproved'),
        timestamp: data.approval.approvedAt,
        status: 'completed',
        icon: 'thumbs-up',
      });
    } else if (data.approval.requiresApproval) {
      steps.push({
        id: 'approval',
        label: t('timeline.pendingApproval'),
        status: 'current',
        icon: 'clock',
      });
      return steps;
    }
  }

  if (data.cancelledAt) {
    steps.push({
      id: 'cancelled',
      label: t('timeline.cancelled'),
      timestamp: data.cancelledAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  }

  if (VISITOR_DECLINED_STATUSES.includes(data.status)) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorDeclined'),
      timestamp: data.acceptedAt,
      status: 'error',
      icon: 'x-circle',
    });
    return steps;
  } else if (VISITOR_ACCEPTED_STATUSES.includes(data.status) || data.acceptedAt) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.visitorAccepted'),
      timestamp: data.acceptedAt,
      status: 'completed',
      icon: 'user-check',
    });
  } else if (AWAITING_VISITOR_STATUSES.includes(data.status)) {
    steps.push({
      id: 'visitor_response',
      label: t('timeline.awaitingVisitor'),
      status: 'current',
      icon: 'clock',
    });
    return steps;
  }

  if (CHECKED_IN_STATUSES.includes(data.status) || data.checkedInAt) {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      timestamp: data.checkedInAt,
      status: 'completed',
      icon: 'log-in',
    });
  } else {
    steps.push({
      id: 'checked_in',
      label: t('timeline.visitorCheckedIn'),
      status: 'pending',
      icon: 'log-in',
    });
  }

  if (COMPLETED_REQUEST_STATUSES.includes(data.status) || data.completedAt) {
    steps.push({
      id: 'completed',
      label: t('timeline.visitCompleted'),
      timestamp: data.completedAt,
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

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  iconColumn: {
    alignItems: 'center',
    width: 28,
    marginEnd: Spacing.md,
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
});
