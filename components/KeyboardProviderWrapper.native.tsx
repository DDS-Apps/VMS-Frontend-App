import React from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

interface KeyboardProviderWrapperProps {
  children: React.ReactNode;
}

export function KeyboardProviderWrapper({ children }: KeyboardProviderWrapperProps) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
