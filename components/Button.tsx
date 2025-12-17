import React, { ReactNode } from "react";
import { ViewStyle, StyleProp } from "react-native";
import { LoadingButton } from "@/components/shared/LoadingButton";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Button({
  onPress,
  children,
  style,
  disabled = false,
}: ButtonProps) {
  return (
    <LoadingButton
      onPress={onPress}
      disabled={disabled}
      variant="primary"
      size="medium"
      style={style}
    >
      {children}
    </LoadingButton>
  );
}
