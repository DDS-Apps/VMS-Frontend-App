import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { apiConfig } from '@/api/config';

WebBrowser.maybeCompleteAuthSession();

export type AzureErrorType = 'not_configured' | 'no_token' | 'auth_failed' | 'cancelled' | null;

interface MicrosoftAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  errorType?: AzureErrorType;
}

interface UseAzureAuthReturn {
  isLoading: boolean;
  errorType: AzureErrorType;
  isConfigured: boolean;
  promptAsync: () => Promise<MicrosoftAuthResult | null>;
  clearError: () => void;
}

function parseAuthResponseUrl(url: string): { 
  accessToken?: string; 
  refreshToken?: string; 
  expiresIn?: number; 
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  error?: string;
} {
  try {
    const parsed = Linking.parse(url);
    const queryParams = parsed.queryParams || {};
    
    const hashPart = url.includes('#') ? url.split('#')[1] : '';
    const hashParams: Record<string, string> = {};
    if (hashPart) {
      hashPart.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          hashParams[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }
    
    const accessToken = (queryParams.access_token as string) || 
                        (queryParams.token as string) || 
                        hashParams.access_token || 
                        hashParams.token;
    const refreshToken = (queryParams.refresh_token as string) || hashParams.refresh_token;
    const expiresInStr = (queryParams.expires_in as string) || hashParams.expires_in;
    const error = (queryParams.error as string) || hashParams.error;
    
    let user: { id: string; email: string; name: string; role: string; } | undefined;
    const userId = (queryParams.user_id as string) || hashParams.user_id;
    const userEmail = (queryParams.user_email as string) || hashParams.user_email;
    const userName = (queryParams.user_name as string) || hashParams.user_name;
    const userRole = (queryParams.user_role as string) || hashParams.user_role;
    
    if (userId && userEmail) {
      user = {
        id: userId,
        email: userEmail,
        name: userName || '',
        role: userRole || '',
      };
    }
    
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInStr ? parseInt(expiresInStr, 10) : undefined,
      user,
      error,
    };
  } catch (err) {
    console.error('[AzureAuth] Error parsing auth response URL:', err);
    return {};
  }
}

function getAppRedirectUrl(): string {
  const schemeConfig = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(schemeConfig) ? schemeConfig[0] : (schemeConfig || 'dallah-vms');
  return Linking.createURL('auth/callback', { scheme });
}

export function useAzureAuth(): UseAzureAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<AzureErrorType>(null);
  
  const microsoftAuthBaseUrl = apiConfig.microsoftAuthUrl;
  const isConfigured = Boolean(microsoftAuthBaseUrl);

  const promptAsync = useCallback(async (): Promise<MicrosoftAuthResult | null> => {
    if (!microsoftAuthBaseUrl) {
      setErrorType('not_configured');
      return { accessToken: '', errorType: 'not_configured' };
    }

    setIsLoading(true);
    setErrorType(null);

    try {
      const microsoftLoginUrl = `${microsoftAuthBaseUrl}${apiConfig.endpoints.auth.microsoftLogin}`;
      const backendCallbackUrl = `${microsoftAuthBaseUrl}${apiConfig.endpoints.auth.microsoftCallback}`;
      
      console.log('[AzureAuth] Starting Microsoft login flow');
      console.log('[AzureAuth] Login URL:', microsoftLoginUrl);
      console.log('[AzureAuth] Backend callback URL:', backendCallbackUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        microsoftLoginUrl,
        backendCallbackUrl,
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );

      console.log('[AzureAuth] Auth session result type:', result.type);
      console.log('[AzureAuth] Result URL:', result.type === 'success' ? result.url : 'N/A');

      if (result.type === 'success' && result.url) {
        const parsedResponse = parseAuthResponseUrl(result.url);

        if (parsedResponse.error) {
          console.log('[AzureAuth] Error from callback:', parsedResponse.error);
          setErrorType('auth_failed');
          setIsLoading(false);
          return { accessToken: '', errorType: 'auth_failed' };
        }

        if (!parsedResponse.accessToken) {
          console.log('[AzureAuth] No access token received in response');
          console.log('[AzureAuth] Full URL for debugging:', result.url);
          setErrorType('no_token');
          setIsLoading(false);
          return { accessToken: '', errorType: 'no_token' };
        }

        console.log('[AzureAuth] Successfully received token');
        setIsLoading(false);
        return {
          accessToken: parsedResponse.accessToken,
          refreshToken: parsedResponse.refreshToken,
          expiresIn: parsedResponse.expiresIn,
          user: parsedResponse.user,
        };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('[AzureAuth] Auth cancelled by user');
        setIsLoading(false);
        return { accessToken: '', errorType: 'cancelled' };
      } else {
        console.log('[AzureAuth] Auth failed with type:', result.type);
        setErrorType('auth_failed');
        setIsLoading(false);
        return { accessToken: '', errorType: 'auth_failed' };
      }
    } catch (err) {
      console.error('[AzureAuth] Error during auth:', err);
      setErrorType('auth_failed');
      setIsLoading(false);
      return { accessToken: '', errorType: 'auth_failed' };
    }
  }, [microsoftAuthBaseUrl]);

  const clearError = useCallback(() => {
    setErrorType(null);
  }, []);

  return {
    isLoading,
    errorType,
    isConfigured,
    promptAsync,
    clearError,
  };
}

export default useAzureAuth;
