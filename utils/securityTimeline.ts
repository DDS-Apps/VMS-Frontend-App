export interface SecurityTimelineSource {
  checkedInAt?: string;
  checkedOutAt?: string;
  completedAt?: string;
  timeline?: {
    checkedInAt?: string;
    checkedOutAt?: string;
    completedAt?: string;
  };
}

export interface SecurityTimelineTimestamps {
  arrivedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export const getSecurityTimelineTimestamps = (
  visitor: SecurityTimelineSource,
): SecurityTimelineTimestamps => {
  const checkedInAt = visitor.timeline?.checkedInAt ?? visitor.checkedInAt;
  // Administrative completion is not evidence of a physical gate exit.
  const checkedOutAt = visitor.timeline?.checkedOutAt ?? visitor.checkedOutAt;

  return {
    // The Security flow records arrival and check-in as the same gate event.
    arrivedAt: checkedInAt,
    checkedInAt,
    checkedOutAt,
  };
};