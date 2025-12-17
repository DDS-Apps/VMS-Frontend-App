import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type BuffetStaffStackParamList = {
  BuffetBoard: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type BuffetBoardScreenProps = NativeStackScreenProps<
  BuffetStaffStackParamList,
  "BuffetBoard"
>;
