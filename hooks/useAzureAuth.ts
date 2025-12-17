import { useState, useCallback, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const AZURE_TENANT_ID = 'common';
const AZURE_CLIENT_ID = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || '';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
  revocationEndpoint: `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/logout`,
};

export type AzureErrorType = 'not_configured' | 'no_token' | 'auth_failed' | 'cancelled' | null;

interface AzureAuthResult {
  accessToken: string;
  idToken?: string;
  errorType?: AzureErrorType;
}

interface UseAzureAuthReturn {
  isLoading: boolean;
  errorType: AzureErrorType;
  isConfigured: boolean;
  promptAsync: () => Promise<AzureAuthResult | null>;
  clearError: () => void;
}

export function useAzureAuth(): UseAzureAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<AzureErrorType>(null);
  
  const isConfigured = Boolean(AZURE_CLIENT_ID);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'dallahvms',
    path: 'auth',
  });

  const [request, response, promptAsyncInternal] = AuthSession.useAuthRequest(
    {
      clientId: AZURE_CLIENT_ID || 'placeholder',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      prompt: AuthSession.Prompt.SelectAccount,
      extraParams: {
        nonce: Math.random().toString(36).substring(2),
      },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'error') {
      setErrorType('auth_failed');
      setIsLoading(false);
    }
  }, [response]);

  const promptAsync = useCallback(async (): Promise<AzureAuthResult | null> => {
    if (!AZURE_CLIENT_ID) {
      setErrorType('not_configured');
      return { accessToken: '', errorType: 'not_configured' };
    }

    setIsLoading(true);
    setErrorType(null);

    try {
      const result = await promptAsyncInternal();

      if (result?.type === 'success') {
        const { access_token, id_token } = result.params;
        
        if (!access_token) {
          setErrorType('no_token');
          setIsLoading(false);
          return { accessToken: '', errorType: 'no_token' };
        }

        setIsLoading(false);
        return {
          accessToken: access_token,
          idToken: id_token,
        };
      } else if (result?.type === 'cancel' || result?.type === 'dismiss') {
        setIsLoading(false);
        return { accessToken: '', errorType: 'cancelled' };
      } else if (result?.type === 'error') {
        setErrorType('auth_failed');
        setIsLoading(false);
        return { accessToken: '', errorType: 'auth_failed' };
      }

      setIsLoading(false);
      return null;
    } catch (err) {
      setErrorType('auth_failed');
      setIsLoading(false);
      return { accessToken: '', errorType: 'auth_failed' };
    }
  }, [promptAsyncInternal]);

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
