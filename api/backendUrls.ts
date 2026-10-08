import Constants from "expo-constants";

// Native builds retain the environment resolved by app.config.js.
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://vms.dallah.com';

export const MICROSOFT_AUTH_BASE_URL =
  Constants.expoConfig?.extra?.microsoftAuthUrl ||
  process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL ||
  API_BASE_URL;
