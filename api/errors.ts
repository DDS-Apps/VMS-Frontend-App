import { AxiosError } from 'axios';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface ApiError {
  code: ApiErrorCode;
  status?: number;
  message: string;
  details?: unknown;
  originalError?: Error;
}

export class ApiException extends Error implements ApiError {
  code: ApiErrorCode;
  status?: number;
  details?: unknown;
  originalError?: Error;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
    this.originalError = error.originalError;
  }
}

export function mapAxiosErrorToApiError(error: AxiosError<{ message?: string; error?: string; details?: unknown }>): ApiError {
  if (error.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out. Please try again.',
      originalError: error,
    };
  }

  if (error.code === 'ERR_CANCELED') {
    return {
      code: 'CANCELLED',
      message: 'Request was cancelled.',
      originalError: error,
    };
  }

  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your connection.',
      originalError: error,
    };
  }

  const { status, data } = error.response;
  const message = data?.message || data?.error || error.message || 'An unexpected error occurred';

  switch (status) {
    case 400:
    case 422:
      return {
        code: 'VALIDATION_ERROR',
        status,
        message,
        details: data?.details || data,
        originalError: error,
      };
    case 401:
      return {
        code: 'UNAUTHORIZED',
        status,
        message: message || 'Session expired. Please login again.',
        originalError: error,
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        status,
        message: message || 'You do not have permission to perform this action.',
        originalError: error,
      };
    case 404:
      return {
        code: 'NOT_FOUND',
        status,
        message: message || 'The requested resource was not found.',
        originalError: error,
      };
    case 409:
      return {
        code: 'CONFLICT',
        status,
        message,
        details: data?.details,
        originalError: error,
      };
    default:
      if (status >= 500) {
        return {
          code: 'SERVER_ERROR',
          status,
          message: 'Server error. Please try again later.',
          originalError: error,
        };
      }
      return {
        code: 'UNKNOWN',
        status,
        message,
        originalError: error,
      };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isUnauthorizedError(error: unknown): boolean {
  return isApiError(error) && error.code === 'UNAUTHORIZED';
}

export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');
}

export function isValidationError(error: unknown): boolean {
  return isApiError(error) && error.code === 'VALIDATION_ERROR';
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
