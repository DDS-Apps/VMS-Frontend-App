import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { apiConfig } from './config';
import { ApiException, mapAxiosErrorToApiError } from './errors';

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
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeToTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function notifySubscribers(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
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
}

const httpClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() || 'UNKNOWN';
    const url = `${config.baseURL || ''}${config.url || ''}`;
    const hasAuth = !!accessToken;
    console.log(`[HTTP Request] ${method} ${url} | Auth: ${hasAuth ? 'yes' : 'no'}`);
    
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
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
    console.log(`[HTTP Response] ${method} ${url} | Status: ${response.status}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToTokenRefresh((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(httpClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${apiConfig.baseUrl}${apiConfig.endpoints.auth.refresh}`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const unwrappedData = unwrapResponse<{ accessToken: string; refreshToken: string }>(response.data);
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = unwrappedData;
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        onTokenRefreshed?.(newAccessToken, newRefreshToken);

        notifySubscribers(newAccessToken);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return httpClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        clearTokens();
        onTokenRefreshFailed?.();
        const apiError = mapAxiosErrorToApiError(error as AxiosError<{ message?: string; error?: string; details?: unknown }>);
        throw new ApiException(apiError);
      }
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
