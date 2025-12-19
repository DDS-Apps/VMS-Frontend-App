import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

interface KeyboardProviderWrapperProps {
  children: React.ReactNode;
}

function isChrome(): boolean {
  try {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes("chrome") && !userAgent.includes("edg");
  } catch {
    return false;
  }
}

export function KeyboardProviderWrapper({ children }: KeyboardProviderWrapperProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isChrome()) {
      const rafId = requestAnimationFrame(() => {
        setTimeout(() => {
          setIsReady(true);
        }, 0);
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      setIsReady(true);
    }
  }, []);

  if (!isReady) {
    return <View style={styles.placeholder} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
  },
});
