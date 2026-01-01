export default {
  expo: {
    name: "Dallah Digital VMS",
    slug: "dallah-vms",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "dallahvms",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    android: {
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/images/android-icon-foreground.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.dallah.vms"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dallah.vms",
      appleTeamId: "SNJM77V43A",
      buildNumber: "2",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    web: {
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-logo.png",
          imageWidth: 320,
          resizeMode: "contain",
          backgroundColor: "#0e2342",
          dark: {
            backgroundColor: "#0e2342"
          }
        }
      ],
      "expo-web-browser"
    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_VMS_API_BASE_URL?.replace(/\/api\/?$/, '') || '',
      microsoftAuthUrl: process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || '',
      eas: {
        projectId: "33b6baff-6c89-44be-905f-006d0da4434d"
      }
    },
    owner: "ahsanshafiq"
  }
};
