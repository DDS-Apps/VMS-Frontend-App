import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TodaysVisitor } from "@/services/state/receptionistVisitorState";

export type ReceptionistStackParamList = {
  ReceptionistDashboard: undefined;
  VisitTypeSelection: undefined;
  VisitorRequestForm: { visitType?: string } | undefined;
  WalkInRegistration: { visitType?: string };
  AllVisitors: { initialFilter?: 'walk_in' | 'awaiting_visitor' | 'pending_approval' } | undefined;
  WalkInVisitors: undefined;
  AllVisitorsToday: undefined;
  UpcomingVisitorsList: undefined;
  VisitorDetail: { visitor?: TodaysVisitor; visitId?: string };
  CheckInOutConfirmation: { 
    action: 'check_in' | 'check_out'; 
    visitorName: string; 
    time: string;
  };
  Notifications: undefined;
  Settings: undefined;
};

export type ReceptionistDashboardScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "ReceptionistDashboard"
>;

export type VisitTypeSelectionScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "VisitTypeSelection"
>;

export type WalkInRegistrationScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "WalkInRegistration"
>;

export type AllVisitorsScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "AllVisitors"
>;

export type WalkInVisitorsScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "WalkInVisitors"
>;

export type AllVisitorsTodayScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "AllVisitorsToday"
>;

export type UpcomingVisitorsListScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "UpcomingVisitorsList"
>;

export type VisitorDetailScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "VisitorDetail"
>;

export type CheckInOutConfirmationScreenProps = NativeStackScreenProps<
  ReceptionistStackParamList,
  "CheckInOutConfirmation"
>;
