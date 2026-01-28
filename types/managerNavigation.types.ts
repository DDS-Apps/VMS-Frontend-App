import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type ManagerStackParamList = {
  Dashboard: undefined;
  Approvals: undefined;
  AwaitingVisitor: undefined;
  WalkInVisitors: undefined;
  ManagerApprovalDetail: { requestId: string };
  VisitTypeSelection: undefined;
  VisitorRequestForm: { visitType?: string };
  VisitorRequests: { initialTab?: 'all' | 'pending' | 'awaiting' | 'walkin' } | undefined;
  AllRequests: { initialTab?: 'all' | 'approved' | 'rejected' } | undefined;
  RequestDetails: { requestId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type ManagerDashboardScreenProps = NativeStackScreenProps<
  ManagerStackParamList,
  "Dashboard"
>;

export type ManagerApprovalsScreenProps = NativeStackScreenProps<
  ManagerStackParamList,
  "Approvals"
>;

export type ManagerApprovalDetailScreenProps = NativeStackScreenProps<
  ManagerStackParamList,
  "ManagerApprovalDetail"
>;
