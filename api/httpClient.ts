import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from './config';
import { ApiException, mapAxiosErrorToApiError } from './errors';
import { InFlightGetRegistry, stableRequestValue, type GetRequestOptions } from './inFlightGet';
import {
  normalizeRequestPath,
  recordRequestTiming,
  type RequestEndReason,
  type RequestOutcome,
} from './requestTiming';

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

// Bumped whenever the session identity changes (tokens cleared by logout, or a
// different refresh token installed by a login). A token refresh that started
// under an earlier epoch must not apply its result: it would re-arm a session
// the user just ended, or overwrite a newer one.
let sessionEpoch = 0;

interface RefreshOperation {
  token: string;
  promise: Promise<string>;
}

// An operation is scoped to a session epoch. An old refresh can therefore
// finish harmlessly after logout/new-login without blocking the new session.
const refreshOperations = new Map<number, RefreshOperation>();

/**
 * Startup restore code may use this narrower predicate when deciding whether a
 * cached session can remain visible. Runtime refresh follows the product
 * policy below and clears its affected session after every refresh failure.
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
const inFlightGets = new InFlightGetRegistry();

type TransportRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retryAttempt?: number;
  __sessionEpoch?: number;
  __accessTokenAtDispatch?: string | null;
  __preserveSessionOnRefreshFailure?: boolean;
};

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function outcomeForError(error: AxiosError): RequestOutcome {
  if (error.response) return 'http_error';
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout';
  if (error.code === 'ERR_CANCELED' || error.code === 'ABORT_ERR') return 'cancelled';
  if (error.request) return 'network';
  return 'unknown';
}

function safeCancellationReason(reason: unknown): RequestEndReason {
  if (reason === 'navigation') return 'navigation';
  if (reason === 'last_subscriber_cancelled') return 'last_subscriber_cancelled';
  if (reason === 'session_changed') return 'session_changed';
  return 'cancelled';
}

function reasonForError(error: AxiosError, config?: TransportRequestConfig): RequestEndReason | undefined {
  if (error.code === 'ECONNABORTED') return 'axios_timeout';
  if (error.code === 'ETIMEDOUT') return 'transport_timeout';
  if (outcomeForError(error) === 'cancelled') {
    const reason = (config?.signal as (AbortSignal & { reason?: unknown }) | undefined)?.reason;
    return safeCancellationReason(reason);
  }
  return undefined;
}

function finishTiming(
  config: TransportRequestConfig | undefined,
  status: number | null,
  outcome: RequestOutcome,
  reason?: RequestEndReason,
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
    reason,
    retryAttempt: config._retryAttempt || 0,
    finishedAt: Date.now(),
  });
  return durationMs;
}

function logTransport(
  event: 'Request' | 'Response' | 'Failure',
  config: TransportRequestConfig | undefined,
  details: { status?: number | null; durationMs?: number | null; outcome?: RequestOutcome; reason?: RequestEndReason } = {},
): void {
  const method = config?.method?.toUpperCase() || 'UNKNOWN';
  const path = normalizeRequestPath(config?.url);
  const fields = [
    `${event}`,
    method,
    path,
    `retry=${config?._retryAttempt || 0}`,
    details.status !== undefined && details.status !== null ? `status=${details.status}` : null,
    details.outcome ? `outcome=${details.outcome}` : null,
    details.reason ? `reason=${details.reason}` : null,
    details.durationMs !== undefined && details.durationMs !== null ? `durationMs=${details.durationMs}` : null,
  ].filter(Boolean);
  console.log(`[HTTP] ${fields.join(' ')}`);
}

function sessionChangedError(): ApiException {
  return new ApiException({
    code: 'CANCELLED',
    message: 'Request was cancelled because the session changed.',
  });
}

function hasSessionChanged(config: TransportRequestConfig | undefined): boolean {
  return config?.__sessionEpoch !== undefined && config.__sessionEpoch !== sessionEpoch;
}

function preservesSessionOnRefreshFailure(config: TransportRequestConfig | undefined): boolean {
  return config?.__preserveSessionOnRefreshFailure === true;
}

function recordRefreshTiming(
  startedAt: number,
  status: number | null,
  outcome: RequestOutcome,
  reason?: RequestEndReason,
): void {
  const durationMs = Math.round(now() - startedAt);
  recordRequestTiming({
    method: 'POST',
    path: normalizeRequestPath(apiConfig.endpoints.auth.refresh),
    status,
    durationMs,
    outcome,
    reason,
    retryAttempt: 0,
    finishedAt: Date.now(),
  });
  console.log(
    `[HTTP] Refresh POST ${normalizeRequestPath(apiConfig.endpoints.auth.refresh)} ` +
      `retry=0${status === null ? '' : ` status=${status}`} outcome=${outcome}` +
      `${reason ? ` reason=${reason}` : ''} durationMs=${durationMs}`,
  );
}

function refreshFailureFor(error: unknown): ApiException {
  if (error instanceof ApiException) return error;
  return new ApiException(
    mapAxiosErrorToApiError(error as AxiosError<{ message?: string; error?: string; details?: unknown }>),
  );
}

function failSessionAfterRefresh(epoch: number): void {
  // A refresh from a session that has since ended must never sign out the
  // current session. clearTokens changes the epoch before the callback runs.
  if (sessionEpoch !== epoch) return;
  clearTokens();
  try {
    onTokenRefreshFailed?.();
  } catch {
    // The transport failure remains the authoritative caller error. Never log
    // callback errors because they can contain application data.
  }
}

async function refreshAccessToken(epoch: number, token: string): Promise<string> {
  const startedAt = now();
  let refreshResponse;
  try {
    refreshResponse = await axios.post(
      `${apiConfig.baseUrl}${apiConfig.endpoints.auth.refresh}`,
      { refreshToken: token },
      { headers: { 'Content-Type': 'application/json' }, timeout: apiConfig.timeout },
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    recordRefreshTiming(
      startedAt,
      axiosError.response?.status ?? null,
      outcomeForError(axiosError),
      reasonForError(axiosError),
    );
    if (sessionEpoch !== epoch) throw sessionChangedError();

    const refreshFailure = refreshFailureFor(error);
    throw refreshFailure;
  }

  if (sessionEpoch !== epoch) {
    recordRefreshTiming(startedAt, refreshResponse.status, 'cancelled', 'session_changed');
    throw sessionChangedError();
  }

  const data = unwrapResponse<{ accessToken?: string; refreshToken?: string }>(refreshResponse.data);
  if (!data?.accessToken || !data?.refreshToken) {
    recordRefreshTiming(startedAt, refreshResponse.status, 'http_error');
    const refreshFailure = new ApiException({
      code: 'SERVER_ERROR',
      status: refreshResponse.status,
      message: 'The session could not be refreshed. Please sign in again.',
    });
    throw refreshFailure;
  }

  recordRefreshTiming(startedAt, refreshResponse.status, 'ok');
  // Do not call setRefreshToken here. A rotation is still the same session and
  // must not invalidate GET ownership or requests waiting in this epoch.
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  try {
    onTokenRefreshed?.(data.accessToken, data.refreshToken);
  } catch {
    // Persistence callbacks are best effort; successful auth must still replay
    // the protected callers.
  }
  return data.accessToken;
}

function getOrStartRefresh(epoch: number, token: string): Promise<string> {
  const active = refreshOperations.get(epoch);
  if (active && active.token === token) return active.promise;

  const promise = refreshAccessToken(epoch, token);
  const operation: RefreshOperation = { token, promise };
  refreshOperations.set(epoch, operation);
  void promise.finally(() => {
    if (refreshOperations.get(epoch) === operation) {
      refreshOperations.delete(epoch);
    }
  }).catch(() => {
    // Callers observe the refresh rejection through their original request.
  });
  return promise;
}

function retryWithToken(originalRequest: TransportRequestConfig, token: string) {
  if (hasSessionChanged(originalRequest)) {
    return Promise.reject(sessionChangedError());
  }
  originalRequest._retry = true;
  originalRequest._retryAttempt = (originalRequest._retryAttempt || 0) + 1;
  originalRequest.__accessTokenAtDispatch = token;
  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${token}`;
  }
  return httpClient(originalRequest);
}

httpClient.interceptors.request.use(
  async (requestConfig: InternalAxiosRequestConfig) => {
    const config = requestConfig as TransportRequestConfig;
    if (config.__sessionEpoch === undefined) {
      config.__sessionEpoch = sessionEpoch;
    }
    if (hasSessionChanged(config)) {
      return Promise.reject(sessionChangedError());
    }

    // A protected read that starts while another request refreshes must wait
    // instead of sending the stale token and causing another 401.
    const refreshOperation = refreshOperations.get(sessionEpoch);
    if (refreshOperation) {
      let token: string;
      try {
        token = await refreshOperation.promise;
      } catch (error) {
        if (!preservesSessionOnRefreshFailure(config)) {
          failSessionAfterRefresh(config.__sessionEpoch ?? sessionEpoch);
        }
        throw error;
      }
      if (hasSessionChanged(config)) {
        return Promise.reject(sessionChangedError());
      }
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    config.__accessTokenAtDispatch = accessToken;
    requestStartTimes.set(config, now());
    logTransport('Request', config);
    return config;
  },
  (error) => {
    console.log('[HTTP] Request rejected before transport');
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  (response) => {
    const config = response.config as TransportRequestConfig;
    if (hasSessionChanged(config)) {
      const durationMs = finishTiming(config, response.status, 'cancelled', 'session_changed');
      logTransport('Response', config, {
        status: response.status,
        durationMs,
        outcome: 'cancelled',
        reason: 'session_changed',
      });
      throw sessionChangedError();
    }
    const durationMs = finishTiming(config, response.status, 'ok');
    logTransport('Response', config, { status: response.status, durationMs, outcome: 'ok' });
    return response;
  },
  async (error: AxiosError) => {
    // A request interceptor uses ApiException to intentionally stop work from
    // a stale session. Preserve that classification instead of turning it into
    // a generic network error in this Axios error interceptor.
    if (error instanceof ApiException) {
      throw error;
    }
    const originalRequest = error.config as TransportRequestConfig | undefined;
    const failedStatus = error.response?.status ?? null;
    const outcome = outcomeForError(error);
    const reason = reasonForError(error, originalRequest);
    const failedDurationMs = finishTiming(originalRequest, failedStatus, outcome, reason);
    logTransport('Failure', originalRequest, {
      status: failedStatus,
      durationMs: failedDurationMs,
      outcome,
      reason,
    });

    if (hasSessionChanged(originalRequest)) {
      throw sessionChangedError();
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && refreshToken) {
      const epochAtFailure = originalRequest.__sessionEpoch ?? sessionEpoch;

      // A request sent before an already-completed refresh may report its old
      // token late. Replay it once with the current token; do not refresh twice.
      const tokenWasRotated = originalRequest.__accessTokenAtDispatch !== accessToken && !!accessToken;
      let newToken: string;
      try {
        newToken = tokenWasRotated
          ? accessToken!
          : await getOrStartRefresh(epochAtFailure, refreshToken);
      } catch (refreshError) {
        if (!preservesSessionOnRefreshFailure(originalRequest)) {
          failSessionAfterRefresh(epochAtFailure);
        }
        throw refreshError;
      }
      return retryWithToken(originalRequest, newToken);
    }

    const apiError = mapAxiosErrorToApiError(error as AxiosError<{ message?: string; error?: string; details?: unknown }>);
    throw new ApiException(apiError);
  }
);

export { httpClient };

export function get<T>(
  url: string,
  params?: Record<string, unknown>,
  options: GetRequestOptions = {},
): Promise<T> {
  // The epoch makes reads from different accounts distinct even when their URL
  // and parameters are identical. Values are only used in memory, never logs.
  // The refresh-failure policy is part of the request's auth semantics, so a
  // startup-preserving read must not share a promise with a runtime read.
  const key = `${sessionEpoch}|${url}|${stableRequestValue(params)}|preserve=${options.preserveSessionOnRefreshFailure === true}`;
  return inFlightGets.subscribe(
    key,
    async (signal) => {
      const response = await httpClient.get(url, {
        params,
        signal,
        __preserveSessionOnRefreshFailure: options.preserveSessionOnRefreshFailure === true,
      } as unknown as TransportRequestConfig);
      return unwrapResponse<T>(response.data);
    },
    options,
  );
}

export async function post<T, D = unknown>(url: string, data?: D): Promise<T> {
  const response = await httpClient.post(url, data);
  return unwrapResponse<T>(response.data);
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
  const response = await httpClient.delete(url, { data });
  if (response.status === 204) {
    return undefined as T;
  }
  return unwrapResponse<T>(response.data);
}

export default httpClient;
