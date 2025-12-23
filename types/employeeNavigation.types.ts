import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type EmployeeStackParamList = {
  Dashboard: undefined;
  VisitorRequests: { initialTab?: 'upcoming' | 'waiting' | 'past' | 'all' } | undefined;
  VisitTypeSelection: undefined;
  VisitorRequestForm: { visitType?: string };
  RequestDetails: { requestId: string };
  ParkMyCar: undefined;
  MyValetRequests: undefined;
  ValetRequestDetails: { requestId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type ParkMyCarScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "ParkMyCar"
>;

export type EmployeeDashboardScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "Dashboard"
>;

export type VisitorRequestsScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "VisitorRequests"
>;

export type VisitTypeSelectionScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "VisitTypeSelection"
>;

export type VisitorRequestFormScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "VisitorRequestForm"
>;

export type RequestDetailsScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "RequestDetails"
> & {
  userRole?: 'employee' | 'manager' | 'receptionist' | 'security' | 'admin' | 'buffet_admin' | 'valet_admin' | 'valet_driver' | 'building_admin';
};

export type MyValetRequestsScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "MyValetRequests"
>;

export type ValetRequestDetailsScreenProps = NativeStackScreenProps<
  EmployeeStackParamList,
  "ValetRequestDetails"
>;
