import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type SecurityStackParamList = {
  CheckIn: undefined;
  SecurityVisitorDetail: { visitorId: string };
  GateEventsLog: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type SecurityCheckInScreenProps = NativeStackScreenProps<
  SecurityStackParamList,
  "CheckIn"
>;

export type SecurityVisitorDetailScreenProps = NativeStackScreenProps<
  SecurityStackParamList,
  "SecurityVisitorDetail"
>;

export type GateEventsLogScreenProps = NativeStackScreenProps<
  SecurityStackParamList,
  "GateEventsLog"
>;
