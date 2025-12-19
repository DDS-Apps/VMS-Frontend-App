import { Platform } from "react-native";

export interface BrowserInfo {
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isWeb: boolean;
}

export function getBrowserInfo(): BrowserInfo {
  const defaultInfo: BrowserInfo = {
    isChrome: false,
    isFirefox: false,
    isSafari: false,
    isEdge: false,
    isWeb: Platform.OS === "web",
  };

  if (Platform.OS !== "web") {
    return defaultInfo;
  }

  try {
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      isChrome: userAgent.includes("chrome") && !userAgent.includes("edg"),
      isFirefox: userAgent.includes("firefox"),
      isSafari: userAgent.includes("safari") && !userAgent.includes("chrome"),
      isEdge: userAgent.includes("edg"),
      isWeb: true,
    };
  } catch {
    return defaultInfo;
  }
}

export const browserInfo = getBrowserInfo();
