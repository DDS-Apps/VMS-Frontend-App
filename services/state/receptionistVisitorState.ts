import { addNotification, createPendingApprovalNotification, createCancellationNotification } from './notificationState';

export type VisitType = 'general' | 'parking' | 'valet' | 'buffet';
export type VisitOrigin = 'scheduled' | 'walk_in';

interface TodaysVisitor {
  id: string;
  name: string;
  company: string;
  phone: string;
  host: string;
  time: string;
  status: 'pending' | 'checked_in' | 'completed';
  parking?: string;
  valet?: string;
  isWalkIn?: boolean;
  visitType?: VisitType;
  origin: VisitOrigin;
  scheduledFor: string;
  createdAt: string;
}

const today = new Date().toISOString().split('T')[0];

let mockTodaysVisitors: TodaysVisitor[] = [
  { id: '1', name: 'Sarah Johnson', company: 'TechCorp Inc.', phone: '+966 50 123 4567', host: 'Renad', time: '10:00 AM', status: 'checked_in', parking: 'B1-23', visitType: 'parking', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '2', name: 'Michael Chen', company: 'Solutions Ltd.', phone: '+966 55 234 5678', host: 'Ahmed', time: '2:00 PM', status: 'pending', valet: 'Yes', visitType: 'valet', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '3', name: 'Emma Williams', company: 'Consulting Group', phone: '+966 56 345 6789', host: 'Fatima', time: '9:00 AM', status: 'completed', visitType: 'general', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '4', name: 'David Brown', company: 'Finance Corp', phone: '+966 53 456 7890', host: 'Omar', time: '11:30 AM', status: 'pending', visitType: 'general', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '5', name: 'Lisa Anderson', company: 'Marketing Plus', phone: '+966 54 567 8901', host: 'Nora', time: '3:00 PM', status: 'pending', parking: 'B1-15', visitType: 'parking', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '6', name: 'Robert Taylor', company: 'Global Tech', phone: '+966 50 987 6543', host: 'Khalid', time: '1:00 PM', status: 'pending', visitType: 'general', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '7', name: 'Jennifer Lee', company: 'Design Co.', phone: '+966 55 876 5432', host: 'Layla', time: '4:30 PM', status: 'pending', parking: 'B2-05', visitType: 'parking', origin: 'scheduled', scheduledFor: today, createdAt: today },
  { id: '8', name: 'Mohammed Ali', company: 'Consulting Experts', phone: '+966 56 765 4321', host: 'Amira', time: '10:30 AM', status: 'checked_in', valet: 'Yes', visitType: 'valet', origin: 'scheduled', scheduledFor: today, createdAt: today },
];

export function getTodaysVisitors(): TodaysVisitor[] {
  return mockTodaysVisitors.map(v => ({ ...v }));
}

export function checkInVisitor(visitorId: string): void {
  const visitor = mockTodaysVisitors.find(v => v.id === visitorId);
  
  mockTodaysVisitors = mockTodaysVisitors.map(v => 
    v.id === visitorId ? { ...v, status: 'checked_in' as const } : { ...v }
  );

  if (visitor) {
    addNotification({
      type: 'check_in',
      title: 'Visitor Checked In',
      message: `${visitor.name} from ${visitor.company} has checked in at the reception.`,
      read: false,
      actionRequired: false,
      priority: 'medium',
    });
  }
}

export function checkOutVisitor(visitorId: string): void {
  const visitor = mockTodaysVisitors.find(v => v.id === visitorId);
  
  mockTodaysVisitors = mockTodaysVisitors.map(v => 
    v.id === visitorId ? { ...v, status: 'completed' as const } : { ...v }
  );

  if (visitor) {
    addNotification({
      type: 'update',
      title: 'Visitor Checked Out',
      message: `${visitor.name} from ${visitor.company} has checked out.`,
      read: false,
      actionRequired: false,
      priority: 'low',
    });
  }
}

/**
 * Registers a walk-in visitor in the receptionist's daily operational list.
 *
 * NOTE: Walk-in records are intentionally NOT mirrored into visitorRequestState.
 *
 * Architecture rationale:
 * - receptionistVisitorState is the receptionist's same-day operational view
 *   (a flat list of TodaysVisitor objects used by ReceptionistDashboardScreen,
 *   AllVisitorsScreen, WalkInVisitorsScreen, etc.).
 * - visitorRequestState is the formal approval-workflow store (VisitorRequest
 *   objects with employee/manager approval chains), consumed by Employee and
 *   Manager role screens.
 * - In the live API flow, receptionist walk-in registration goes through
 *   receptionApiService.registerWalkIn(), which persists the record on the
 *   backend. The receptionist's daily list is then refreshed via
 *   receptionApiService.getTodayVisitors(). Managers see pending walk-in
 *   approvals through the dedicated pendingHostWalkIns API endpoint, mapped
 *   to VisitorRequest shape by mapPendingHostWalkInToVisitorRequest() in
 *   useApprovalQueries.ts.
 * - Duplicating walk-ins into visitorRequestState would create a divergent
 *   mock-only record that bypasses the real approval path and is never seen
 *   by manager screens in production.
 */
export function addWalkInVisitor(visitorData: { name: string; company: string; phone: string; host: string; visitType?: VisitType; purpose?: string }): string {
  const newId = String(Date.now());
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const currentDate = new Date().toISOString().split('T')[0];
  
  const newVisitor: TodaysVisitor = {
    id: newId,
    name: visitorData.name,
    company: visitorData.company,
    phone: visitorData.phone,
    host: visitorData.host,
    time: currentTime,
    status: 'pending',
    isWalkIn: true,
    visitType: visitorData.visitType || 'general',
    origin: 'walk_in',
    scheduledFor: currentDate,
    createdAt: currentDate,
  };
  
  mockTodaysVisitors = [newVisitor, ...mockTodaysVisitors];

  addNotification({
    type: 'assignment',
    title: 'New Walk-In Visitor',
    message: `${visitorData.name} from ${visitorData.company} has been registered as a walk-in visitor for ${visitorData.host}. Pending approval.`,
    read: false,
    actionRequired: true,
    priority: 'high',
  });

  return newId;
}

export function getAllUpcomingVisitors(): TodaysVisitor[] {
  const today = new Date().toISOString().split('T')[0];
  return mockTodaysVisitors
    .filter(v => v.scheduledFor >= today && v.status !== 'completed')
    .map(v => ({ ...v }));
}

export function getWalkInVisitors(): TodaysVisitor[] {
  return mockTodaysVisitors
    .filter(v => v.origin === 'walk_in')
    .map(v => ({ ...v }));
}

export function cancelVisitor(visitorId: string): boolean {
  const visitor = mockTodaysVisitors.find(v => v.id === visitorId);
  
  if (!visitor || visitor.status !== 'pending') {
    return false;
  }
  
  mockTodaysVisitors = mockTodaysVisitors.filter(v => v.id !== visitorId);

  createCancellationNotification(
    'Receptionist',
    visitor.name,
    visitorId,
    'receptionist'
  );

  addNotification({
    type: 'request_cancelled',
    title: 'Visitor Cancelled',
    message: `The visit for ${visitor.name} from ${visitor.company} has been cancelled by the receptionist.`,
    read: false,
    actionRequired: false,
    priority: 'medium',
  });

  return true;
}

export type VisitorExceptionType = 
  | 'communication_failure'
  | 'qr_issue'
  | 'badge_malfunction'
  | 'identity_mismatch'
  | 'escort_required'
  | 'other';

export interface VisitorException {
  id: string;
  visitorId: string;
  visitorName: string;
  exceptionType: VisitorExceptionType;
  guidanceNotes: string;
  floor?: string;
  room?: string;
  reportedBy: string;
  reportedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

let visitorExceptions: VisitorException[] = [];

export function markVisitorException(
  visitorId: string,
  exceptionType: VisitorExceptionType,
  guidanceNotes: string,
  floor?: string,
  room?: string
): VisitorException | null {
  const visitor = mockTodaysVisitors.find(v => v.id === visitorId);
  if (!visitor) return null;

  const exception: VisitorException = {
    id: `exc_${Date.now()}`,
    visitorId,
    visitorName: visitor.name,
    exceptionType,
    guidanceNotes,
    floor,
    room,
    reportedBy: 'Receptionist',
    reportedAt: new Date().toISOString(),
    resolved: false,
  };

  visitorExceptions = [exception, ...visitorExceptions];

  addNotification({
    type: 'alert',
    title: 'Visitor Exception Reported',
    message: `Exception for ${visitor.name}: ${exceptionType.replace(/_/g, ' ')}. ${guidanceNotes}`,
    read: false,
    actionRequired: true,
    priority: 'high',
  });

  return exception;
}

export function getVisitorExceptions(): VisitorException[] {
  return [...visitorExceptions];
}

export function getVisitorExceptionsByVisitor(visitorId: string): VisitorException[] {
  return visitorExceptions.filter(e => e.visitorId === visitorId);
}

export function resolveVisitorException(exceptionId: string, resolvedBy: string): boolean {
  const index = visitorExceptions.findIndex(e => e.id === exceptionId);
  if (index === -1) return false;
  
  visitorExceptions[index] = {
    ...visitorExceptions[index],
    resolved: true,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  };
  return true;
}

export type { TodaysVisitor };
