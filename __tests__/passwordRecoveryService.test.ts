import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { passwordResetClient, passwordResetService, resetRetrySeconds } from '@/services/api/passwordResetService';
import { clearTokens, setAccessToken, setRefreshToken, httpClient } from '@/api/httpClient';

function reply(config: InternalAxiosRequestConfig, status: number, data: unknown, headers = {}) {
  return { config, status, statusText: '', data, headers };
}

describe('public password recovery transport contract', () => {
  afterEach(() => { clearTokens(); jest.restoreAllMocks(); });

  it.each(['local', 'unknown', 'inactive', 'sso'])('handles the same neutral %s fixture without session credentials', async source => {
    setAccessToken('old-access');
    setRefreshToken('old-refresh');
    const protectedPost = jest.spyOn(httpClient, 'post');
    passwordResetClient.defaults.adapter = async config => {
      expect(config.headers.get('Authorization')).toBeUndefined();
      expect(config.withCredentials).toBe(false);
      expect(JSON.parse(config.data)).toEqual({ email: `${source}@example.test`, locale: 'ar' });
      expect(config.url).toBe('/api/v1/auth/forgot-password');
      return reply(config, 202, { success: true, data: { accepted: true } });
    };
    await expect(passwordResetService.request({ email: `${source}@example.test`, locale: 'ar' })).resolves.toBeUndefined();
    expect(protectedPost).not.toHaveBeenCalled();
  });

  it('rejects fake success, missing endpoints and unexpected envelopes', async () => {
    for (const [status, data] of [[200, '<html>SPA fallback</html>'], [202, { success: false }], [202, {}]]) {
      passwordResetClient.defaults.adapter = async config => reply(config, status as number, data);
      await expect(passwordResetService.request({ email: 'test@example.test', locale: 'en' })).rejects.toMatchObject({ kind: 'unavailable' });
    }
  });

  it('validates without consuming, then sends exact passwords without returning credentials', async () => {
    const expiresAt = new Date(Date.now() + 900000).toISOString();
    const requests: string[] = [];
    passwordResetClient.defaults.adapter = async config => {
      requests.push(config.url!);
      if (config.url?.endsWith('/validate')) {
        expect(JSON.parse(config.data)).toEqual({ token: 'fixture-token' });
        return reply(config, 200, { success: true, data: { valid: true, expiresAt } });
      }
      expect(JSON.parse(config.data)).toEqual({ token: 'fixture-token', newPassword: ' exact ', confirmPassword: ' exact ' });
      return reply(config, 200, { success: true, data: { reset: true } });
    };
    await expect(passwordResetService.validate('fixture-token')).resolves.toEqual({ valid: true, expiresAt });
    await expect(passwordResetService.reset({ token: 'fixture-token', newPassword: ' exact ', confirmPassword: ' exact ' })).resolves.toBeUndefined();
    expect(requests).toEqual(['/api/v1/auth/reset-password/validate', '/api/v1/auth/reset-password']);
  });

  it.each([
    [400, 'RESET_LINK_INVALID', 'invalidLink'],
    [401, 'RESET_LINK_INVALID', 'invalidLink'],
    [422, 'PASSWORD_POLICY_FAILED', 'validation'],
    [401, 'AUTH_REQUIRED', 'unavailable'],
    [404, 'NOT_FOUND', 'unavailable'],
    [503, 'SMTP_FAILED', 'unavailable'],
    [429, 'RATE_LIMITED', 'rateLimit'],
  ])('sanitizes %s / %s and never retries or refreshes', async (status, code, kind) => {
    const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('raw-secret-password', 'ERR_BAD_REQUEST', config, {}, reply(config, status, {
        error: { code, message: 'raw-secret-password' }, token: 'fixture-token',
      }, { 'retry-after': '120' }));
    });
    passwordResetClient.defaults.adapter = adapter;
    const error = await passwordResetService.reset({ token: 'fixture-token', newPassword: 'raw-secret-password', confirmPassword: 'raw-secret-password' }).catch(e => e);
    expect(error.kind).toBe(kind);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(error.originalError).toBeUndefined();
    expect(error.config).toBeUndefined();
    expect(JSON.stringify(error)).not.toMatch(/fixture-token|raw-secret-password/);
    if (kind === 'rateLimit') expect(error.retryAfterSeconds).toBe(120);
  });

  it('handles expiration, negative validation and network failures explicitly', async () => {
    for (const data of [{ valid: false }, { valid: true, expiresAt: '2000-01-01T00:00:00Z' }]) {
      passwordResetClient.defaults.adapter = async config => reply(config, 200, data);
      await expect(passwordResetService.validate('fixture')).rejects.toMatchObject({ kind: 'invalidLink' });
    }
    passwordResetClient.defaults.adapter = async config => { throw new axios.AxiosError('timeout', 'ECONNABORTED', config); };
    await expect(passwordResetService.validate('fixture')).rejects.toMatchObject({ kind: 'network' });
    expect(resetRetrySeconds('garbage')).toBe(60);
    expect(resetRetrySeconds('Thu, 01 Jan 1970 00:02:00 GMT', 0)).toBe(120);
  });
});
