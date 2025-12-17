import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type DriverStackParamList = {
  DriverTasks: undefined;
  DriverTaskDetail: { taskId: string };
  Notifications: undefined;
  Settings: undefined;
};

export type DriverTasksScreenProps = NativeStackScreenProps<
  DriverStackParamList,
  "DriverTasks"
>;

export type DriverTaskDetailScreenProps = NativeStackScreenProps<
  DriverStackParamList,
  "DriverTaskDetail"
>;
