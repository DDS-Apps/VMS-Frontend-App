import React from "react";
import { Platform } from "react-native";

interface KeyboardProviderWrapperProps {
  children: React.ReactNode;
}

let KeyboardProviderWrapperComponent: React.FC<KeyboardProviderWrapperProps>;

if (Platform.OS === "web") {
  KeyboardProviderWrapperComponent = require("./KeyboardProviderWrapper.web").KeyboardProviderWrapper;
} else {
  KeyboardProviderWrapperComponent = require("./KeyboardProviderWrapper.native").KeyboardProviderWrapper;
}

export const KeyboardProviderWrapper = KeyboardProviderWrapperComponent;
