import { ApiError, isValidationError } from './errors';

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationErrors {
  [field: string]: string[];
}

export interface ParsedValidationResult {
  hasErrors: boolean;
  fieldErrors: ValidationErrors;
  generalError?: string;
}

export function parseValidationErrors(error: unknown): ParsedValidationResult {
  const result: ParsedValidationResult = {
    hasErrors: false,
    fieldErrors: {},
  };

  if (!isValidationError(error)) {
    if (error instanceof Error) {
      result.generalError = error.message;
    }
    return result;
  }

  const apiError = error as ApiError;
  result.hasErrors = true;

  if (!apiError.details) {
    result.generalError = apiError.message;
    return result;
  }

  const details = apiError.details as unknown;

  if (Array.isArray(details)) {
    for (const detail of details) {
      if (typeof detail === 'object' && detail !== null) {
        const fieldError = detail as { field?: string; property?: string; path?: string; message?: string; constraints?: Record<string, string> };
        const fieldName = fieldError.field || fieldError.property || fieldError.path || 'general';
        
        if (!result.fieldErrors[fieldName]) {
          result.fieldErrors[fieldName] = [];
        }

        if (fieldError.message) {
          result.fieldErrors[fieldName].push(fieldError.message);
        } else if (fieldError.constraints) {
          result.fieldErrors[fieldName].push(...Object.values(fieldError.constraints));
        }
      }
    }
  } else if (typeof details === 'object' && details !== null) {
    const detailsObj = details as Record<string, unknown>;
    
    if (detailsObj.errors && Array.isArray(detailsObj.errors)) {
      for (const err of detailsObj.errors) {
        if (typeof err === 'object' && err !== null) {
          const fieldError = err as { field?: string; property?: string; message?: string };
          const fieldName = fieldError.field || fieldError.property || 'general';
          
          if (!result.fieldErrors[fieldName]) {
            result.fieldErrors[fieldName] = [];
          }
          
          if (fieldError.message) {
            result.fieldErrors[fieldName].push(fieldError.message);
          }
        }
      }
    } else if (detailsObj.message && typeof detailsObj.message === 'string') {
      result.generalError = detailsObj.message;
    } else {
      for (const [field, value] of Object.entries(detailsObj)) {
        if (!result.fieldErrors[field]) {
          result.fieldErrors[field] = [];
        }
        
        if (typeof value === 'string') {
          result.fieldErrors[field].push(value);
        } else if (Array.isArray(value)) {
          result.fieldErrors[field].push(...value.filter((v): v is string => typeof v === 'string'));
        }
      }
    }
  }

  if (Object.keys(result.fieldErrors).length === 0) {
    result.generalError = apiError.message;
  }

  return result;
}

export function getFieldError(fieldErrors: ValidationErrors, field: string): string | undefined {
  const errors = fieldErrors[field];
  return errors && errors.length > 0 ? errors[0] : undefined;
}

export function hasFieldError(fieldErrors: ValidationErrors, field: string): boolean {
  return field in fieldErrors && fieldErrors[field].length > 0;
}

export function clearFieldError(
  fieldErrors: ValidationErrors,
  field: string
): ValidationErrors {
  const newErrors = { ...fieldErrors };
  delete newErrors[field];
  return newErrors;
}

export function mergeFieldErrors(
  existing: ValidationErrors,
  incoming: ValidationErrors
): ValidationErrors {
  const merged = { ...existing };
  
  for (const [field, errors] of Object.entries(incoming)) {
    if (merged[field]) {
      merged[field] = [...merged[field], ...errors];
    } else {
      merged[field] = errors;
    }
  }
  
  return merged;
}
