export interface CanonicalTimeline {
  requestedAt?: string | null;
  approvedAt?: string | null;
  visitorAcceptedAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  completedAt?: string | null;
}

interface TimelineTimestampSource {
  createdAt: string;
  acceptedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  completedAt?: string;
  approval?: {
    requiresApproval: boolean;
    autoApproved?: boolean;
    approvedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
  };
  timeline?: CanonicalTimeline;
}

/**
 * Promotes canonical backend timeline timestamps to the legacy flat fields
 * consumed by each role-specific timeline builder.
 */
export const withCanonicalTimelineTimestamps = <T extends TimelineTimestampSource>(
  data: T,
): T => {
  const timeline = data.timeline;
  if (!timeline) return data;

  const approvedAt = timeline.approvedAt ?? data.approval?.approvedAt;
  const approval = data.approval
    ? { ...data.approval, approvedAt: approvedAt ?? undefined }
    : approvedAt
      ? { requiresApproval: false, approvedAt }
      : undefined;

  return {
    ...data,
    createdAt: timeline.requestedAt ?? data.createdAt,
    acceptedAt: timeline.visitorAcceptedAt ?? data.acceptedAt,
    checkedInAt: timeline.checkedInAt ?? data.checkedInAt,
    checkedOutAt: timeline.checkedOutAt ?? data.checkedOutAt,
    completedAt: timeline.completedAt ?? data.completedAt,
    approval,
  };
};