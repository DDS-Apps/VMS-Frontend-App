import { isApiError } from '@/api/errors';

type Translate = (key: string) => string;

/**
 * Converts transport categories to safe, localized UI copy. Raw API messages
 * are deliberately not displayed: they can contain identifiers or backend
 * implementation details.
 */
export function getLocalizedApiErrorMessage(error: unknown, t: Translate): string {
  if (isApiError(error)) {
    switch (error.code) {
      case 'TIMEOUT':
        return t('toast.timeoutError');
      case 'NETWORK_ERROR':
        return t('toast.networkError');
      case 'UNAUTHORIZED':
        return t('toast.sessionExpired');
      case 'FORBIDDEN':
        return t('errors.unauthorized');
      case 'SERVER_ERROR':
        return t('toast.serverError');
      case 'CANCELLED':
        return '';
      default:
        return t('errors.somethingWentWrong');
    }
  }
  return t('errors.somethingWentWrong');
}