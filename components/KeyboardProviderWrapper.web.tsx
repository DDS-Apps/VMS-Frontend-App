import React from "react";

interface KeyboardProviderWrapperProps {
  children: React.ReactNode;
}

export function KeyboardProviderWrapper({ children }: KeyboardProviderWrapperProps) {
  return <>{children}</>;
}
