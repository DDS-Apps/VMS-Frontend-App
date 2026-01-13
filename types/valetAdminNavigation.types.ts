import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ValetRequest } from "@/services/state/valetAdminState";

export type ValetAdminStackParamList = {
  ValetAdminDashboard: undefined;
  ValetDrivers: undefined;
  ValetParking: undefined;
  ValetAllRequests: undefined;
  ValetRequestDetails: { request: ValetRequest };
  Notifications: undefined;
  Settings: undefined;
};

export type ValetAdminDashboardScreenProps = NativeStackScreenProps<
  ValetAdminStackParamList,
  "ValetAdminDashboard"
>;

export type ValetDriversScreenProps = NativeStackScreenProps<
  ValetAdminStackParamList,
  "ValetDrivers"
>;

export type ValetParkingScreenProps = NativeStackScreenProps<
  ValetAdminStackParamList,
  "ValetParking"
>;

export type ValetAllRequestsScreenProps = NativeStackScreenProps<
  ValetAdminStackParamList,
  "ValetAllRequests"
>;

export type ValetRequestDetailsScreenProps = NativeStackScreenProps<
  ValetAdminStackParamList,
  "ValetRequestDetails"
>;
