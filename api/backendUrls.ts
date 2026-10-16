import backend from '../config/web-backend.json';

// Native builds stay on the live backend independently of the Replit QA web target.
export const API_BASE_URL = backend.origin;
export const MICROSOFT_AUTH_BASE_URL = backend.origin;
