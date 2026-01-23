import { Platform } from 'react-native';

// TEMPORARILY DISABLED: Firebase Crashlytics plugins commented out in app.json
// due to incompatibility with New Architecture + static frameworks on Expo SDK 54.
// To re-enable: Add these plugins back to app.json:
//   "@react-native-firebase/app",
//   "@react-native-firebase/crashlytics",
//   ["expo-build-properties", { "ios": { "useFrameworks": "static" } }],
//   "./plugins/withFirebaseModularHeaders.js"
const CRASHLYTICS_DISABLED = true;

type CrashlyticsInstance = {
  log: (message: string) => void;
  recordError: (error: Error, jsErrorName?: string) => void;
  crash: () => void;
  setUserId: (userId: string) => Promise<null>;
  setAttribute: (name: string, value: string) => Promise<null>;
  setAttributes: (attributes: Record<string, string>) => Promise<null>;
  setCrashlyticsCollectionEnabled: (enabled: boolean) => Promise<null>;
};

let crashlyticsInstance: CrashlyticsInstance | null = null;
let isInitialized = false;

const noopCrashlytics: CrashlyticsInstance = {
  log: (message: string) => {
    if (__DEV__) {
      console.log('[Crashlytics Mock]', message);
    }
  },
  recordError: (error: Error, jsErrorName?: string) => {
    if (__DEV__) {
      console.error('[Crashlytics Mock] Error:', jsErrorName || error.name, error.message);
    }
  },
  crash: () => {
    if (__DEV__) {
      console.warn('[Crashlytics Mock] crash() called - only works in production builds');
    }
  },
  setUserId: async () => null,
  setAttribute: async () => null,
  setAttributes: async () => null,
  setCrashlyticsCollectionEnabled: async () => null,
};

const initializeCrashlytics = (): CrashlyticsInstance => {
  if (isInitialized && crashlyticsInstance !== null) {
    return crashlyticsInstance;
  }

  // Temporarily disabled - using mock implementation
  if (CRASHLYTICS_DISABLED || Platform.OS === 'web') {
    if (__DEV__) {
      console.log('[Crashlytics] Disabled or web platform - using mock implementation');
    }
    crashlyticsInstance = noopCrashlytics;
    isInitialized = true;
    return noopCrashlytics;
  }

  try {
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    const instance: CrashlyticsInstance = crashlytics();
    crashlyticsInstance = instance;
    isInitialized = true;
    
    if (__DEV__) {
      console.log('[Crashlytics] Native module initialized successfully');
    }
    
    return instance;
  } catch (error) {
    if (__DEV__) {
      console.log('[Crashlytics] Native module not available - using mock implementation');
      console.log('[Crashlytics] Install @react-native-firebase/crashlytics for production builds');
    }
    crashlyticsInstance = noopCrashlytics;
    isInitialized = true;
    return noopCrashlytics;
  }
};

export const crashlyticsService = {
  log: (message: string): void => {
    const instance = initializeCrashlytics();
    instance.log(message);
  },

  recordError: (error: Error, context?: string): void => {
    const instance = initializeCrashlytics();
    const errorName = context ? `${context}: ${error.name}` : error.name;
    instance.recordError(error, errorName);
  },

  recordJSException: (error: Error, componentStack?: string): void => {
    const instance = initializeCrashlytics();
    
    instance.log(`JS Exception: ${error.message}`);
    
    if (componentStack) {
      instance.log(`Component Stack: ${componentStack.slice(0, 500)}`);
    }
    
    instance.recordError(error, 'JavaScript Exception');
  },

  crash: (): void => {
    const instance = initializeCrashlytics();
    instance.crash();
  },

  setUserId: async (userId: string): Promise<void> => {
    const instance = initializeCrashlytics();
    await instance.setUserId(userId);
  },

  setAttribute: async (name: string, value: string): Promise<void> => {
    const instance = initializeCrashlytics();
    await instance.setAttribute(name, value);
  },

  setAttributes: async (attributes: Record<string, string>): Promise<void> => {
    const instance = initializeCrashlytics();
    await instance.setAttributes(attributes);
  },

  setUserAttributes: async (user: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
  }): Promise<void> => {
    const instance = initializeCrashlytics();
    
    await instance.setUserId(user.id);
    
    const attributes: Record<string, string> = {};
    if (user.email) attributes.email = user.email;
    if (user.name) attributes.name = user.name;
    if (user.role) attributes.role = user.role;
    
    if (Object.keys(attributes).length > 0) {
      await instance.setAttributes(attributes);
    }
  },

  clearUserAttributes: async (): Promise<void> => {
    const instance = initializeCrashlytics();
    await instance.setUserId('');
    await instance.setAttributes({
      email: '',
      name: '',
      role: '',
    });
  },

  setCrashlyticsCollectionEnabled: async (enabled: boolean): Promise<void> => {
    const instance = initializeCrashlytics();
    await instance.setCrashlyticsCollectionEnabled(enabled);
  },

  isNativeModuleAvailable: (): boolean => {
    if (Platform.OS === 'web') {
      return false;
    }
    
    try {
      require('@react-native-firebase/crashlytics');
      return true;
    } catch {
      return false;
    }
  },
};

export default crashlyticsService;
