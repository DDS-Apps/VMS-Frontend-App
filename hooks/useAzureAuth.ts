import { useState, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
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
    
    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInStr ? parseInt(expiresInStr, 10) : undefined,
      error,
    };
  } catch (err) {
    console.error('[AzureAuth] Error parsing auth response URL:', err);
    return {};
  }
}

export function useAzureAuth(): UseAzureAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<AzureErrorType>(null);
  
  const microsoftAuthBaseUrl = apiConfig.microsoftAuthUrl;
  const isConfigured = Boolean(microsoftAuthBaseUrl);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'dallahvms',
    path: 'auth/callback',
  });

  const promptAsync = useCallback(async (): Promise<MicrosoftAuthResult | null> => {
    if (!microsoftAuthBaseUrl) {
      setErrorType('not_configured');
      return { accessToken: '', errorType: 'not_configured' };
    }

    setIsLoading(true);
    setErrorType(null);

    try {
      const microsoftLoginUrl = `${microsoftAuthBaseUrl}${apiConfig.endpoints.auth.microsoftLogin}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log('[AzureAuth] Starting Microsoft login flow');
      console.log('[AzureAuth] Redirect URI:', redirectUri);
      console.log('[AzureAuth] Login URL:', microsoftLoginUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        microsoftLoginUrl,
        redirectUri,
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );

      console.log('[AzureAuth] Auth session result type:', result.type);

      if (result.type === 'success' && result.url) {
        if (!result.url.startsWith(redirectUri.split('?')[0])) {
          console.log('[AzureAuth] Callback URL does not match expected redirect URI');
          setErrorType('auth_failed');
          setIsLoading(false);
          return { accessToken: '', errorType: 'auth_failed' };
        }

        const parsedResponse = parseAuthResponseUrl(result.url);

        if (parsedResponse.error) {
          console.log('[AzureAuth] Error from callback:', parsedResponse.error);
          setErrorType('auth_failed');
          setIsLoading(false);
          return { accessToken: '', errorType: 'auth_failed' };
        }

        if (!parsedResponse.accessToken) {
          console.log('[AzureAuth] No access token received in response');
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
  }, [redirectUri, microsoftAuthBaseUrl]);

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
