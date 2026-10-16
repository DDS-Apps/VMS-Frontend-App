import backend from '../config/web-backend.json';

// Every native build uses the same live backend as web, even with stale env/Expo metadata.
export const API_BASE_URL = backend.origin;
export const MICROSOFT_AUTH_BASE_URL = backend.origin;
