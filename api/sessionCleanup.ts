import axios from 'axios';
import { apiConfig } from './config';

/**
 * Cleanup belongs to the captured, ending session. Never refresh it, attach a
 * newer account's credentials, or invoke the shared client's sign-out handler.
 */
export async function sendSessionCleanup(
  method: 'delete' | 'post',
  url: string,
  data: Record<string, string>,
  accessToken: string | null,
): Promise<void> {
  if (!accessToken) throw new Error('Session cleanup requires authorization.');
  let responseStatus: number | undefined;
  try {
    const response = await axios.request({
      method, url, baseURL: apiConfig.baseUrl, timeout: apiConfig.timeout,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      data,
    });
    responseStatus = response.status;
    if (response.status < 200 || response.status >= 300 || response.data?.success === false) {
      throw new Error('Session cleanup was not confirmed.');
    }
    console.log(`[Session cleanup] ${method.toUpperCase()} ${url} authorization=present status=${response.status}`);
  } catch (error) {
    const status = (axios.isAxiosError(error) ? error.response?.status : undefined) ?? responseStatus;
    console.warn(`[Session cleanup] ${method.toUpperCase()} ${url} authorization=present status=${status ?? 'unavailable'} failed`);
    throw error;
  }
}
