import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from './config';
import { ApiException, mapAxiosErrorToApiError } from './errors';
import { normalizeRequestPath, recordRequestTiming, type RequestOutcome } from './requestTiming';

interface WrappedApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

function isWrappedResponse<T>(response: unknown): response is WrappedApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'data' in response &&
    typeof (response as WrappedApiResponse<T>).success === 'boolean'
  );
}

function unwrapResponse<T>(responseData: unknown): T {
  if (isWrappedResponse<T>(responseData)) {
    return responseData.data;
  }
  return responseData as T;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onTokenRefreshFailed: (() => void) | null = null;
let onTokenRefreshed: ((accessToken: string, refreshToken: string) => void) | null = null;
let isRefreshing = false;

// Bumped whenever the session identity changes (tokens cleared by logout, or a
// different refresh token installed by a login). A token refresh that started
// under an earlier epoch must not apply its result: it would re-arm a session
// the user just ended, or overwrite a newer one.
let sessionEpoch = 0;

interface RefreshWaiter {
  onRefreshed: (token: string) => void;
  onFailed: (error: unknown) => void;
}

let refreshWaiters: RefreshWaiter[] = [];

function subscribeToTokenRefresh(waiter: RefreshWaiter): void {
  refreshWaiters.push(waiter);
}

function notifyWaiters(token: string): void {
  const waiters = refreshWaiters;
  refreshWaiters = [];
  waiters.forEach((waiter) => waiter.onRefreshed(token));
}

function failWaiters(error: unknown): void {
  const waiters = refreshWaiters;
  refreshWaiters = [];
  waiters.forEach((waiter) => waiter.onFailed(error));
}

/**
 * A refresh attempt only proves the session is dead when the server actually
 * evaluated the refresh token and rejected it (a 4xx other than the transient
 * 408/429). Network failures, timeouts and 5xx responses say nothing about the
 * session, so the stored tokens are kept and the request fails with the
 * transient error instead of UNAUTHORIZED; the next request simply tries again.
 */
export function isDefinitiveRefreshFailure(refreshError: unknown): boolean {
  if (!axios.isAxiosError(refreshError)) return false;
  const status = refreshError.response?.status;
  if (status === undefined) return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  if (token !== refreshToken) {
    sessionEpoch += 1;
  }
  refreshToken = token;
}

export function getSessionEpoch(): number {
  return sessionEpoch;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function setOnTokenRefreshFailed(callback: (() => void) | null): void {
  onTokenRefreshFailed = callback;
}

export function setOnTokenRefreshed(callback: ((accessToken: string, refreshToken: string) => void) | null): void {
  onTokenRefreshed = callback;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  sessionEpoch += 1;
}

const httpClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Start times keyed by the request config object, which axios hands back
// unchanged on both the response and the error path.
const requestStartTimes = new WeakMap<object, number>();

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function outcomeForError(error: AxiosError): RequestOutcome {
  if (error.response) return 'http_error';
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout';
  if (error.code === 'ERR_CANCELED') return 'cancelled';
  if (error.request) return 'network';
  return 'unknown';
}

function finishTiming(
  config: InternalAxiosRequestConfig | undefined,
  status: number | null,
  outcome: RequestOutcome,
): number | null {
  if (!config) return null;
  const startedAt = requestStartTimes.get(config);
  if (startedAt === undefined) return null;
  requestStartTimes.delete(config);

  const durationMs = Math.round(now() - startedAt);
  recordRequestTiming({
    method: config.method?.toUpperCase() || 'UNKNOWN',
    path: normalizeRequestPath(config.url),
    status,
    durationMs,
    outcome,
    finishedAt: Date.now(),
  });
  return durationMs;
}

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() || 'UNKNOWN';
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const hasAuth = !!accessToken;
    console.log(`[HTTP Request] ${method} ${url} | Auth: ${hasAuth ? 'yes' : 'no'}`);
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    requestStartTimes.set(config, now());
    return config;
  },
  (error) => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase() || 'UNKNOWN';
    const url = response.config.url || '';
    const durationMs = finishTiming(response.config, response.status, 'ok');
    console.log(
      `[HTTP Response] ${method} ${url} | Status: ${response.status}` +
        (durationMs !== null ? ` | ${durationMs}ms` : ''),
    );
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const failedStatus = error.response?.status ?? null;
    const failedDurationMs = finishTiming(originalRequest, failedStatus, outcomeForError(error));
    console.log(
      `[HTTP Failure] ${originalRequest?.method?.toUpperCase() || 'UNKNOWN'} ${originalRequest?.url || ''}` +
        ` | ${failedStatus !== null ? `Status: ${failedStatus}` : `Code: ${error.code || 'unknown'}`}` +
        (failedDurationMs !== null ? ` | ${failedDurationMs}ms` : ''),
    );

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        // Another request is already refreshing: wait for its outcome instead
        // of racing it. A failed refresh settles every waiter so nothing hangs.
        return new Promise((resolve, reject) => {
          subscribeToTokenRefresh({
            onRefreshed: (newToken: string) => {
              originalRequest._retry = true;
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(httpClient(originalRequest));
            },
            onFailed: reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const epochAtStart = sessionEpoch;

      const failRefresh = (refreshFailure: ApiException): never => {
        isRefreshing = false;
        failWaiters(refreshFailure);
        throw refreshFailure;
      };

      // Logged out (or logged in again) while the refresh was in flight: the
      // outcome belongs to a session that no longer exists. Never apply it to
      // the tokens of whatever session exists now, and never sign that out.
      const failIfSessionChanged = () => {
        if (sessionEpoch !== epochAtStart) {
          failRefresh(
            new ApiException({
              code: 'CANCELLED',
              message: 'The session changed while its token was being refreshed.',
            }),
          );
        }
      };

      let refreshResponse;
      try {
        refreshResponse = await axios.post(
          `${apiConfig.baseUrl}${apiConfig.endpoints.auth.refresh}`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: apiConfig.timeout }
        );
      } catch (refreshError) {
        failIfSessionChanged();

        if (isDefinitiveRefreshFailure(refreshError)) {
          // The server rejected the refresh token: the session is over.
          clearTokens();
          onTokenRefreshFailed?.();
          return failRefresh(
            new ApiException(
              mapAxiosErrorToApiError(error as AxiosError<{ message?: string; error?: string; details?: unknown }>),
            ),
          );
        }

        // Transient refresh failure: keep the tokens and surface the real
        // cause (network, timeout, server error) rather than UNAUTHORIZED.
        const refreshCause = axios.isAxiosError(refreshError)
          ? refreshError.response?.status ?? refreshError.code ?? 'unknown'
          : 'unknown';
        console.warn(`[HTTP] Token refresh failed transiently (${refreshCause}); keeping session`);
        return failRefresh(
          new ApiException(
            mapAxiosErrorToApiError(refreshError as AxiosError<{ message?: string; error?: string; details?: unknown }>),
          ),
        );
      }

      failIfSessionChanged();

      let newAccessToken: string | undefined;
      let newRefreshToken: string | undefined;
      try {
        const unwrappedData = unwrapResponse<{ accessToken: string; refreshToken: string }>(refreshResponse.data);
        newAccessToken = unwrappedData?.accessToken;
        newRefreshToken = unwrappedData?.refreshToken;
      } catch (_unwrapError) {
        // fall through to the malformed-response handling below
      }
      if (!newAccessToken || !newRefreshToken) {
        // The refresh endpoint answered 2xx without tokens. Treat it like a
        // server fault: keep the session and let the caller retry later.
        console.warn('[HTTP] Token refresh returned no tokens; keeping session');
        return failRefresh(
          new ApiException({
            code: 'SERVER_ERROR',
            status: refreshResponse.status,
            message: 'The session could not be refreshed. Please try again.',
          }),
        );
      }

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      onTokenRefreshed?.(newAccessToken, newRefreshToken);

      isRefreshing = false;
      notifyWaiters(newAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return httpClient(originalRequest);
    }

    const apiError = mapAxiosErrorToApiError(error as AxiosError<{ message?: string; error?: string; details?: unknown }>);
    throw new ApiException(apiError);
  }
);

export { httpClient };

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await httpClient.get(url, { params });
  return unwrapResponse<T>(response.data);
}

export async function post<T, D = unknown>(url: string, data?: D): Promise<T> {
  console.log('[httpClient.post] Making POST request to:', url);
  try {
    const response = await httpClient.post(url, data);
    console.log('[httpClient.post] Response status:', response.status);
    return unwrapResponse<T>(response.data);
  } catch (error) {
    console.error('[httpClient.post] Request failed:', error);
    throw error;
  }
}

export async function patch<T, D = unknown>(url: string, data?: D): Promise<T> {
  const response = await httpClient.patch(url, data);
  return unwrapResponse<T>(response.data);
}

export async function put<T, D = unknown>(url: string, data?: D): Promise<T> {
  const response = await httpClient.put(url, data);
  return unwrapResponse<T>(response.data);
}

export async function del<T, D = unknown>(url: string, data?: D): Promise<T | undefined> {
  console.log('[httpClient.del] Making DELETE request to:', url);
  try {
    const response = await httpClient.delete(url, { data });
    console.log('[httpClient.del] Response status:', response.status);
    if (response.status === 204) {
      return undefined as T;
    }
    return unwrapResponse<T>(response.data);
  } catch (error) {
    console.error('[httpClient.del] Request failed:', error);
    throw error;
  }
}

export default httpClient;
