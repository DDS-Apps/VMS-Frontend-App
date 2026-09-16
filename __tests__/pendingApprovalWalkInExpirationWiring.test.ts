import fs from 'fs';
import path from 'path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('pending-approval walk-in expiration wiring', () => {
  const managerGrid = readSource('screens/Manager/ManagerAllRequestsScreen.tsx');
  const managerDetails = readSource('screens/Manager/ManagerApprovalDetailScreen.tsx');
  const employeeUpcoming = readSource('screens/Employee/VisitorRequestsScreen.tsx');
  const receptionistUpcoming = readSource('screens/Receptionist/UpcomingVisitorsListScreen.tsx');
  const visitorCard = readSource('components/shared/VisitorRequestCard.tsx');

  it('uses the targeted helper and scheduled end time in the Manager grid', () => {
    expect(managerGrid).toContain('computeIsPendingApprovalWalkInExpired');
    expect(managerGrid).toMatch(
      /computeIsPendingApprovalWalkInExpired\(\{[\s\S]{0,300}isWalkIn:\s*item\.isWalkIn[\s\S]{0,300}endTime:\s*item\.endTime/,
    );
    expect(managerGrid).not.toContain(
      'statusOverride={showExpiredStatus ? "expired" : undefined}',
    );
    expect(managerGrid).toContain('status: item.status');
    expect(managerGrid).toMatch(
      /return isVisitExpired\(\s*item\.visitDate,\s*item\.visitTime,\s*undefined,\s*item\.duration,\s*\)/,
    );
  });

  it('shows Expired and guards Manager detail actions with the same result', () => {
    expect(managerDetails).toContain('computeIsPendingApprovalWalkInExpired');
    expect(managerDetails).toContain(
      '<RequestStatusBadge status={request.status} />',
    );
    expect(managerDetails).toContain(
      'if (isReadOnlyRole || !visitData?.isWalkIn) return;',
    );
    expect(managerDetails).toContain(
      'if (computeCurrentVisitExpiration()) return;',
    );
    expect(managerDetails).toMatch(
      /showExpiredWalkInFooter\s*=\s*!isReadOnlyRole\s*&&\s*showExpiredWalkInStatus/,
    );
  });

  it('updates the Employee and Receptionist Upcoming status displays', () => {
    expect(employeeUpcoming).toContain('computeIsPendingApprovalWalkInExpired');
    expect(employeeUpcoming).not.toContain(
      'isPendingApprovalWalkInExpired(item) ? "expired" : undefined',
    );
    expect(employeeUpcoming).toContain('status: request.status');

    expect(receptionistUpcoming).toContain('computeIsPendingApprovalWalkInExpired');
    expect(receptionistUpcoming).toContain('status: v.status');
    expect(receptionistUpcoming).toMatch(
      /<VisitorMatrixTable[\s\S]{0,150}showExpiredState/,
    );
  });

  it('keeps the card status override presentation-only', () => {
    expect(visitorCard).toContain('statusOverride?: string');
    expect(visitorCard).toContain('const displayedStatus = statusOverride ?? request.status');
    expect(visitorCard).toContain('eligible: isStatusEligible');
  });
});