import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type BuildingAdminStackParamList = {
  BuildingAdminDashboard: undefined;
  AllRequests: undefined;
  UsersRoles: undefined;
  BuffetOversight: undefined;
  ValetOversight: undefined;
  AllLocations: undefined;
  Reports: undefined;
  SystemRules: undefined;
  Parking: undefined;
  ParkingUtilization: undefined;
  ParkingSpots: undefined;
  ParkingPriorityRules: undefined;
  Valet: undefined;
  ValetTaskDetail: { taskId: string };
  MeetingRooms: undefined;
  MeetingRoomDetail: { roomId: string };
  Buffet: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type BuildingAdminDashboardScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "BuildingAdminDashboard"
>;

export type AllRequestsScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "AllRequests"
>;

export type UsersRolesScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "UsersRoles"
>;

export type SystemRulesScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "SystemRules"
>;

export type MeetingRoomDetailScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "MeetingRoomDetail"
>;

export type ParkingUtilizationScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "ParkingUtilization"
>;

export type ParkingSpotsScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "ParkingSpots"
>;

export type ParkingPriorityRulesScreenProps = NativeStackScreenProps<
  BuildingAdminStackParamList,
  "ParkingPriorityRules"
>;
