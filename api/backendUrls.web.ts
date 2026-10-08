import webBackend from '../config/web-backend.json';

// Metro selects this file only for web; native uses backendUrls.ts.
// Auth must use the same backend as API calls to avoid mixing user sessions.
export const API_BASE_URL = webBackend.origin;
export const MICROSOFT_AUTH_BASE_URL = webBackend.origin;
