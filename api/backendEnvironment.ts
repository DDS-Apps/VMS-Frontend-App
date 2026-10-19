import Constants from 'expo-constants';
import production from '../config/web-backend.json';

// Expo extra is resolved explicitly for the variant. Do not use inherited
// EXPO_PUBLIC_* values: Expo can load production dotenv files during QA exports.
const extra = Constants.expoConfig?.extra;
export const BACKEND_ENVIRONMENT = extra?.environment === 'qa' ? 'qa' : 'production';

function backendOrigin(): string {
  if (BACKEND_ENVIRONMENT === 'production') return production.origin;
  const origin = extra?.apiBaseUrl;
  if (typeof origin !== 'string') throw new Error('QA backend configuration is missing');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password ||
    origin === production.origin || extra?.microsoftAuthUrl !== origin) {
    throw new Error('QA API and sign-in must share a nonproduction HTTPS backend origin');
  }
  return origin;
}

export const API_BASE_URL = backendOrigin();
export const MICROSOFT_AUTH_BASE_URL = API_BASE_URL;
