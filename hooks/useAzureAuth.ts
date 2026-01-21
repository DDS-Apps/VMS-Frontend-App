import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiConfig } from '@/api/config';
import { parseAuthUrl } from '@/utils/authTokenParser';

WebBrowser.maybeCompleteAuthSession();

export type AzureErrorType = 'not_configured' | 'no_token' | 'auth_failed' | 'cancelled' | null;

export interface MicrosoftAuthResult {
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

const MOBILE_SCHEME = 'dallahvms';
const MOBILE_CALLBACK_PATH = 'auth/callback';

function getMobileRedirectUrl(): string {
  return `${MOBILE_SCHEME}://${MOBILE_CALLBACK_PATH}`;
}

function getMicrosoftLoginUrl(platform: 'web' | 'mobile'): string {
  const baseUrl = apiConfig.microsoftAuthUrl;
  const loginEndpoint = apiConfig.endpoints.auth.microsoftLogin;
  return `${baseUrl}${loginEndpoint}?platform=${platform}`;
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
      if (Platform.OS === 'web') {
        const microsoftLoginUrl = getMicrosoftLoginUrl('web');
        
        if (typeof window !== 'undefined') {
          window.location.href = microsoftLoginUrl;
        }
        
        return null;
      } else {
        const mobileRedirectUrl = getMobileRedirectUrl();
        const microsoftLoginUrl = getMicrosoftLoginUrl('mobile');
        

        const result = await WebBrowser.openAuthSessionAsync(
          microsoftLoginUrl,
          mobileRedirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: true,
          }
        );


        if (result.type === 'success' && result.url) {
          const parsedResponse = parseAuthUrl(result.url);
          
            hasAccessToken: !!parsedResponse.accessToken,
            accessTokenLength: parsedResponse.accessToken?.length || 0,
            hasRefreshToken: !!parsedResponse.refreshToken,
            hasExpiresIn: !!parsedResponse.expiresIn,
            expiresIn: parsedResponse.expiresIn,
            hasUser: !!parsedResponse.user,
            hasError: !!parsedResponse.error,
            error: parsedResponse.error,
            errorDescription: parsedResponse.errorDescription,
          });

          if (parsedResponse.error) {
            setErrorType('auth_failed');
            setIsLoading(false);
            return { accessToken: '', errorType: 'auth_failed' };
          }

          if (!parsedResponse.accessToken) {
            setErrorType('no_token');
            setIsLoading(false);
            return { accessToken: '', errorType: 'no_token' };
          }

          setIsLoading(false);
          return {
            accessToken: parsedResponse.accessToken,
            refreshToken: parsedResponse.refreshToken,
            expiresIn: parsedResponse.expiresIn,
            user: parsedResponse.user,
          };
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setIsLoading(false);
          return { accessToken: '', errorType: 'cancelled' };
        } else {
          setErrorType('auth_failed');
          setIsLoading(false);
          return { accessToken: '', errorType: 'auth_failed' };
        }
      }
    } catch (err) {
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
