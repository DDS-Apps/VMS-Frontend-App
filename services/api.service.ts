import { ApiResponse, ApiError } from '../types';

class ApiService {
  private baseURL: string = '';

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.message || 'An error occurred',
          code: response.status.toString(),
          details: data,
        } as ApiError;
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      throw error as ApiError;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T, B = Record<string, unknown>>(endpoint: string, body: B): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T, B = Record<string, unknown>>(endpoint: string, body: B): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();