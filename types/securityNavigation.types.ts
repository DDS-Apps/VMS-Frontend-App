import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SecurityVisitor } from "@/services/mock/securityVisitorState";

export type SecurityStackParamList = {
  CheckIn: undefined;
  SecurityVisitorDetail: { visitor: SecurityVisitor };
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
