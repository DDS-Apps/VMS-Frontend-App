import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BuffetRequest } from "@/services/state/buffetAdminState";

export type BuffetAdminStackParamList = {
  BuffetAdminDashboard: undefined;
  BuffetRequestDetails: { request: BuffetRequest };
  BuffetStaff: undefined;
  BuffetLocations: undefined;
  BuffetAllRequests: undefined;
  BuffetOverview: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type BuffetAdminDashboardScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetAdminDashboard"
>;

export type BuffetRequestDetailsScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetRequestDetails"
>;

export type BuffetAdminStaffScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetStaff"
>;

export type BuffetAdminLocationsScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetLocations"
>;

export type BuffetAllRequestsScreenProps = NativeStackScreenProps<
  BuffetAdminStackParamList,
  "BuffetAllRequests"
>;
