import Constants from 'expo-constants';

// Metro selects this file only for web; native uses backendUrls.ts.
// Replit web builds inline the chosen public backend at build time.
// Microsoft SSO must follow API calls to avoid mixing user sessions.
const configuredApiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL;

if (!configuredApiBaseUrl) {
  throw new Error('Missing web API configuration. Build with scripts/build-web.js.');
}

export const API_BASE_URL = configuredApiBaseUrl;
export const MICROSOFT_AUTH_BASE_URL =
  (Constants.expoConfig?.extra?.microsoftAuthUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL ||
  API_BASE_URL;
