import { useState, useCallback, useRef } from 'react';
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { ApiError, ApiException, getErrorMessage, isValidationError } from '@/api/errors';
import { parseValidationErrors, ValidationErrors, ParsedValidationResult } from '@/api/validation';
import { useToast } from '@/contexts/ToastContext';

export interface FormSubmitOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
  onError?: (error: ApiError, variables: TVariables, context: TContext | undefined) => void;
  onSettled?: (data: TData | undefined, error: ApiError | null, variables: TVariables, context: TContext | undefined) => void;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  resetOnSuccess?: boolean;
}

export interface FormSubmitState {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  fieldErrors: ValidationErrors;
  generalError: string | undefined;
}

export interface FormSubmitResult<TData, TVariables> {
  state: FormSubmitState;
  submit: (variables: TVariables) => Promise<TData | undefined>;
  reset: () => void;
  clearFieldError: (field: string) => void;
  setFieldError: (field: string, message: string) => void;
  getFieldError: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
}

export function useFormSubmit<TData, TVariables, TContext = unknown>(
  options: FormSubmitOptions<TData, TVariables, TContext>
): FormSubmitResult<TData, TVariables> {
  const {
    mutationFn,
    onSuccess,
    onError,
    onSettled,
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
    resetOnSuccess = false,
  } = options;

  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [isSuccess, setIsSuccess] = useState(false);

  const mutation = useMutation<TData, ApiError, TVariables, TContext>({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      setIsSuccess(true);
      setFieldErrors({});
      setGeneralError(undefined);

      if (showSuccessToast && successMessage) {
        toast.showSuccess(successMessage);
      }

      if (onSuccess) {
        await onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      setIsSuccess(false);
      
      const parsed = parseValidationErrors(error);
      
      if (parsed.hasErrors) {
        setFieldErrors(parsed.fieldErrors);
        setGeneralError(parsed.generalError);
      } else {
        setFieldErrors({});
        setGeneralError(getErrorMessage(error));
      }

      if (showErrorToast) {
        const displayMessage = errorMessage || parsed.generalError || getErrorMessage(error);
        toast.showError(displayMessage);
      }

      if (onError) {
        onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (onSettled) {
        onSettled(data, error as ApiError | null, variables, context);
      }
    },
  });

  const submit = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      setFieldErrors({});
      setGeneralError(undefined);
      setIsSuccess(false);

      try {
        const result = await mutation.mutateAsync(variables);
        return result;
      } catch (error) {
        return undefined;
      }
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setFieldErrors({});
    setGeneralError(undefined);
    setIsSuccess(false);
    mutation.reset();
  }, [mutation]);

  const clearFieldErrorFn = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: [message],
    }));
  }, []);

  const getFieldErrorFn = useCallback(
    (field: string): string | undefined => {
      const errors = fieldErrors[field];
      return errors && errors.length > 0 ? errors[0] : undefined;
    },
    [fieldErrors]
  );

  const hasFieldErrorFn = useCallback(
    (field: string): boolean => {
      return field in fieldErrors && fieldErrors[field].length > 0;
    },
    [fieldErrors]
  );

  return {
    state: {
      isSubmitting: mutation.isPending,
      isSuccess,
      isError: mutation.isError,
      fieldErrors,
      generalError,
    },
    submit,
    reset,
    clearFieldError: clearFieldErrorFn,
    setFieldError,
    getFieldError: getFieldErrorFn,
    hasFieldError: hasFieldErrorFn,
  };
}

export interface SimpleFormOptions<TData> {
  onSubmit: () => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

export interface SimpleFormResult<TData> {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | undefined;
  submit: () => Promise<TData | undefined>;
  reset: () => void;
}

export function useSimpleForm<TData>(
  options: SimpleFormOptions<TData>
): SimpleFormResult<TData> {
  const { onSubmit, onSuccess, onError, successMessage, errorMessage } = options;
  const toast = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = useCallback(async (): Promise<TData | undefined> => {
    setIsSubmitting(true);
    setError(undefined);
    setIsSuccess(false);

    try {
      const result = await onSubmit();
      setIsSuccess(true);
      
      if (successMessage) {
        toast.showSuccess(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.showError(errorMessage || message);
      
      if (onError) {
        onError(err);
      }
      
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, onSuccess, onError, successMessage, errorMessage, toast]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSuccess(false);
    setError(undefined);
  }, []);

  return {
    isSubmitting,
    isSuccess,
    error,
    submit,
    reset,
  };
}
