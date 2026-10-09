import axios from 'axios';
import { apiConfig } from '@/api/config';
import type { ForgotPasswordPayload, ResetPasswordPayload, ResetLinkValidation } from '@/types/auth.types';

export type PasswordResetErrorKind = 'invalidLink' | 'rateLimit' | 'validation' | 'unavailable' | 'network';

/** Contains only safe classifications, never raw responses, credentials or request configs. */
export class PasswordResetError extends Error {
  constructor(
    public readonly kind: PasswordResetErrorKind,
    public readonly retryAfterSeconds = 60,
  ) {
    super(`Password recovery: ${kind}`);
    this.name = 'PasswordResetError';
  }
}

// Deliberately isolated from session interceptors: no bearer token, refresh,
// auth-cookie credentials, automatic retries, or request/response body logging.
export const passwordResetClient = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: 30000,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export function resetRetrySeconds(value: unknown, now = Date.now()): number {
  const seconds = typeof value === 'string' && !/^\d+$/.test(value)
    ? Math.ceil((Date.parse(value) - now) / 1000)
    : Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
}

function safeError(error: unknown): PasswordResetError {
  if (error instanceof PasswordResetError) return error;
  if (!axios.isAxiosError(error)) return new PasswordResetError('unavailable');
  if (!error.response) return new PasswordResetError('network');
  const { status, data, headers } = error.response;
  if (status === 429) return new PasswordResetError('rateLimit', resetRetrySeconds(headers?.['retry-after']));
  const code = data?.code ?? data?.error?.code;
  if ([400, 401, 403, 410, 422].includes(status) && code === 'RESET_LINK_INVALID') {
    return new PasswordResetError('invalidLink');
  }
  if ([400, 422].includes(status) && code === 'PASSWORD_POLICY_FAILED') {
    return new PasswordResetError('validation');
  }
  return new PasswordResetError('unavailable');
}

function unwrap(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') throw new PasswordResetError('unavailable');
  const envelope = data as Record<string, unknown>;
  if (envelope.success === false) throw new PasswordResetError('unavailable');
  const body = 'success' in envelope ? envelope.data : envelope;
  if (!body || typeof body !== 'object') throw new PasswordResetError('unavailable');
  return body as Record<string, unknown>;
}

export const passwordResetService = {
  async request(payload: ForgotPasswordPayload): Promise<void> {
    try {
      const response = await passwordResetClient.post(apiConfig.endpoints.auth.forgotPassword, payload);
      if (response.status !== 202 || unwrap(response.data).accepted !== true) {
        throw new PasswordResetError('unavailable');
      }
    } catch (error) {
      // No account-dependent backend error text is exposed to the public form.
      const safe = safeError(error);
      throw safe.kind === 'invalidLink' || safe.kind === 'validation'
        ? new PasswordResetError('unavailable') : safe;
    }
  },
  async validate(token: string): Promise<ResetLinkValidation> {
    try {
      const response = await passwordResetClient.post(apiConfig.endpoints.auth.validateResetPassword, { token });
      if (response.status !== 200) throw new PasswordResetError('unavailable');
      const body = unwrap(response.data);
      if (body.valid === false) throw new PasswordResetError('invalidLink');
      if (body.valid !== true || typeof body.expiresAt !== 'string' || !Number.isFinite(Date.parse(body.expiresAt))) {
        throw new PasswordResetError('unavailable');
      }
      if (Date.parse(body.expiresAt) <= Date.now()) throw new PasswordResetError('invalidLink');
      return { valid: true, expiresAt: body.expiresAt };
    } catch (error) {
      throw safeError(error);
    }
  },
  async reset(payload: ResetPasswordPayload): Promise<void> {
    try {
      const response = await passwordResetClient.post(apiConfig.endpoints.auth.resetPassword, payload);
      if (response.status !== 200 || unwrap(response.data).reset !== true) {
        throw new PasswordResetError('unavailable');
      }
    } catch (error) {
      throw safeError(error);
    }
  },
};
