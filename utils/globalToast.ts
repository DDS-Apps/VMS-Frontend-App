import { isApiError } from '@/api/errors';
import { getTranslation, defaultLocale } from '@/constants/i18n';
import type { SupportedLocale } from '@/constants/i18n/types';

type ToastFn = (message: string, title?: string) => void;

interface GlobalToastMethods {
  showError: ToastFn;
  showSuccess: ToastFn;
  showWarning: ToastFn;
  showInfo: ToastFn;
}

let toastMethods: GlobalToastMethods | null = null;
let currentLocale: SupportedLocale = defaultLocale;
let isLocaleReady = false;
let pendingErrors: unknown[] = [];

function tryFlushPendingErrors() {
  if (isLocaleReady && toastMethods && pendingErrors.length > 0) {
    const errors = [...pendingErrors];
    pendingErrors = [];
    errors.forEach(error => {
      showLocalizedErrorInternal(error);
    });
  }
}

export function registerToastMethods(methods: GlobalToastMethods) {
  toastMethods = methods;
  tryFlushPendingErrors();
}

export function unregisterToastMethods() {
  toastMethods = null;
}

export function setGlobalLocale(locale: SupportedLocale, ready = true) {
  currentLocale = locale;
  isLocaleReady = ready;
  tryFlushPendingErrors();
}

function t(key: string): string {
  return getTranslation(currentLocale, key);
}

export function getLocalizedErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case 'TIMEOUT':
        return t('toast.timeoutError');
      case 'NETWORK_ERROR':
        return t('toast.networkError');
      case 'SERVER_ERROR':
        return t('toast.serverError');
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND':
      case 'FORBIDDEN':
      case 'CONFLICT':
      case 'UNKNOWN':
      default:
        // Return the actual API error message if available, otherwise fall back to generic
        if (error.message && error.message.trim().length > 0) {
          return error.message;
        }
        return t('toast.unknownError');
    }
  }
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return t('toast.timeoutError');
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      return t('toast.networkError');
    }
    // Return the actual error message if it's meaningful
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    return t('toast.unknownError');
  }
  
  return t('toast.unknownError');
}

export function getLocalizedErrorTitle(): string {
  return t('toast.errorTitle');
}

export function showGlobalError(message: string, title?: string) {
  if (toastMethods) {
    toastMethods.showError(message, title);
  } else {
    console.error('[GlobalToast] Error:', title, message);
  }
}

export function showGlobalSuccess(message: string, title?: string) {
  if (toastMethods) {
    toastMethods.showSuccess(message, title);
  } else {
    console.log('[GlobalToast] Success:', title, message);
  }
}

export function showGlobalWarning(message: string, title?: string) {
  if (toastMethods) {
    toastMethods.showWarning(message, title);
  } else {
    console.warn('[GlobalToast] Warning:', title, message);
  }
}

export function showGlobalInfo(message: string, title?: string) {
  if (toastMethods) {
    toastMethods.showInfo(message, title);
  } else {
    console.info('[GlobalToast] Info:', title, message);
  }
}

function showLocalizedErrorInternal(error: unknown) {
  const message = getLocalizedErrorMessage(error);
  const title = getLocalizedErrorTitle();
  showGlobalError(message, title);
}

export function showLocalizedError(error: unknown) {
  if (!isLocaleReady || !toastMethods) {
    pendingErrors.push(error);
    return;
  }
  showLocalizedErrorInternal(error);
}

export const globalToast = {
  showError: showGlobalError,
  showSuccess: showGlobalSuccess,
  showWarning: showGlobalWarning,
  showInfo: showGlobalInfo,
  showLocalizedError,
};
