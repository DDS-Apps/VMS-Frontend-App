/**
 * Environment Configuration Reference
 * 
 * This file documents the structure of environment configurations for Production and QA.
 * 
 * IMPORTANT: 
 * - All actual values are stored in Replit Secrets/Environment Variables
 * - This file only shows the structure and provides helper functions
 * - NEVER hardcode actual API keys, secrets, or credentials in this file
 * 
 * When setting up a new Replit project for an environment:
 * 1. Go to Secrets/Environment Variables in Replit
 * 2. Add each variable listed in the ENV_VAR_KEYS array below
 * 3. Use the values from the environment-specific documentation (provided separately)
 */

export interface EnvironmentConfig {
  name: string;
  description: string;
  backend: {
    apiBaseUrl: string;
    vmsApiBaseUrl: string;
    microsoftAuthUrl: string;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    measurementId: string;
    appIdWeb: string;
    appIdAndroid: string;
    appIdIos: string;
    vapidKey: string;
  };
}

/**
 * Environment identifiers (safe to include - these are public project IDs)
 */
export const ENVIRONMENT_IDENTIFIERS = {
  production: {
    firebaseProjectId: 'dallahdigital-vms',
    description: 'Production environment - Live users',
  },
  qa: {
    firebaseProjectId: 'dallah-albaraka-vms',
    description: 'QA/Testing environment',
  },
} as const;

/**
 * Required Environment Variable Keys
 * 
 * These are the keys that must be set in Replit Secrets for each environment.
 * The actual values should be obtained from the environment-specific documentation.
 */
export const ENV_VAR_KEYS = {
  backend: [
    'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_VMS_API_BASE_URL',
    'EXPO_PUBLIC_MICROSOFT_AUTH_URL',
  ],
  firebase: [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID_WEB',
    'EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID',
    'EXPO_PUBLIC_FIREBASE_APP_ID_IOS',
    'EXPO_PUBLIC_FIREBASE_VAPID_KEY',
  ],
} as const;

/**
 * Get all required environment variable keys
 */
export function getAllEnvVarKeys(): string[] {
  return [...ENV_VAR_KEYS.backend, ...ENV_VAR_KEYS.firebase];
}

/**
 * Helper to detect current environment from env vars
 * Returns 'production' or 'qa' based on Firebase project ID
 */
export function getCurrentEnvironment(): 'production' | 'qa' | 'unknown' {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (projectId === ENVIRONMENT_IDENTIFIERS.production.firebaseProjectId) {
    return 'production';
  }
  if (projectId === ENVIRONMENT_IDENTIFIERS.qa.firebaseProjectId) {
    return 'qa';
  }
  return 'unknown';
}

/**
 * Get the config for the current environment from process.env
 * All values come from environment variables, not hardcoded
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment();
  const identifier = env !== 'unknown' 
    ? ENVIRONMENT_IDENTIFIERS[env] 
    : { firebaseProjectId: '', description: 'Unknown environment' };
  
  return {
    name: env,
    description: identifier.description,
    backend: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
      vmsApiBaseUrl: process.env.EXPO_PUBLIC_VMS_API_BASE_URL || '',
      microsoftAuthUrl: process.env.EXPO_PUBLIC_MICROSOFT_AUTH_URL || '',
    },
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
      appIdWeb: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || '',
      appIdAndroid: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || '',
      appIdIos: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || '',
      vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || '',
    },
  };
}

/**
 * Validate that all required environment variables are set
 * Returns an array of missing variable names
 */
export function validateEnvironmentConfig(): string[] {
  const missing: string[] = [];
  
  for (const key of getAllEnvVarKeys()) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  return missing;
}

/**
 * Log environment info (safe for debugging - no secrets exposed)
 */
export function logEnvironmentInfo(): void {
  const env = getCurrentEnvironment();
  const config = getEnvironmentConfig();
  
  console.log('=== Environment Info ===');
  console.log(`Environment: ${env}`);
  console.log(`Firebase Project: ${config.firebase.projectId}`);
  console.log(`API Base URL: ${config.backend.apiBaseUrl}`);
  console.log('========================');
}
