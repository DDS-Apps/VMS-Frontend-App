import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  setAccessToken, 
  setRefreshToken, 
  clearTokens, 
  setOnTokenRefreshFailed,
  setOnTokenRefreshed,
  getRefreshToken,
} from '@/api/httpClient';
import { authService } from '@/services/api/authService';
import { parseAuthHashFragment, clearUrlHash } from '@/utils/authTokenParser';
import { pushNotificationService } from '@/services/push';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';
import type { AuthTokenResponse, StoredTokens, AuthUserDto } from '@/types/auth.types';
import { isValidRole } from '@/constants/roles';
import type { UserRole } from '@/types/vms.types';

const AUTH_STORAGE_KEY = '@vms_auth';
const TOKEN_STORAGE_KEY = '@vms_tokens';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  autoApproval?: boolean;
  phoneNumber?: string;
  department?: string;
  status?: 'active' | 'inactive';
  source?: string;
  managerId?: string | null;
  managerName?: string | null;
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt?: string;
  lastLogin?: string;
  isSSOUser?: boolean;
  timezone?: string;
  language?: 'en' | 'ar';
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface SSOTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthTokenResponse>;
  azureLogin: (azureToken: string) => Promise<AuthTokenResponse>;
  ssoLogin: (tokens: SSOTokens) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  checkHealth: () => Promise<boolean>;
  isTokenValid: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  onLogout?: () => void;
  onUserLanguageChanged?: (language: 'en' | 'ar') => void;
}

export function AuthProvider({ children, onLogout, onUserLanguageChanged }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const handleLogout = useCallback(async () => {
    try {
      await pushNotificationService.unregister();
    } catch (pushError) {
      console.warn('[AuthContext] Failed to unregister push notifications:', pushError);
    }

    try {
      await crashlyticsService.clearUserAttributes();
    } catch (crashlyticsError) {
      console.warn('[AuthContext] Failed to clear crashlytics user attributes:', crashlyticsError);
    }

    try {
      const currentRefreshToken = getRefreshToken();
      if (currentRefreshToken) {
        await authService.logout(currentRefreshToken);
      }
    } catch (error) {
    } finally {
      clearTokens();
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      onLogout?.();
    }
  }, [onLogout]);

  const persistTokens = useCallback(async (newAccessToken: string, newRefreshToken: string, expiresIn?: number) => {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 86400 * 1000;
    const tokens: StoredTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }, []);

  useEffect(() => {
    setOnTokenRefreshFailed(() => {
      handleLogout();
    });

    setOnTokenRefreshed((newAccessToken, newRefreshToken) => {
      persistTokens(newAccessToken, newRefreshToken);
    });

    return () => {
      setOnTokenRefreshFailed(null);
      setOnTokenRefreshed(null);
    };
  }, [handleLogout, persistTokens]);

  const mapRoleToUserRole = (role: string): UserRole => {
    if (isValidRole(role)) {
      return role;
    }
    console.warn(`Unknown role received from backend: ${role}, defaulting to 'employee'`);
    return 'employee';
  };

  const mapUserDtoToAuthUser = (userDto: AuthUserDto): AuthUser => {
    return {
      id: userDto.id,
      email: userDto.email,
      name: userDto.name,
      role: mapRoleToUserRole(userDto.role),
      autoApproval: userDto.autoApproval,
      phoneNumber: userDto.phoneNumber,
      department: userDto.department,
      status: userDto.status,
      source: userDto.source,
      managerId: userDto.managerId,
      managerName: userDto.managerName,
      photoUrl: userDto.photoUrl,
      thumbnailUrl: userDto.thumbnailUrl,
      createdAt: userDto.createdAt,
      lastLogin: userDto.lastLogin,
      timezone: userDto.timezone,
      language: userDto.language,
    };
  };

  const mapLoginUserToAuthUser = (loginUser: AuthTokenResponse['user']): AuthUser | null => {
    if (!loginUser) {
      console.warn('[AuthContext] Received null/undefined user in token response');
      return null;
    }
    
    if (!loginUser.id || !loginUser.email) {
      console.warn('[AuthContext] User data missing required fields (id or email):', JSON.stringify(loginUser));
      return null;
    }
    
    return {
      id: loginUser.id,
      email: loginUser.email,
      name: loginUser.name || loginUser.email.split('@')[0],
      role: mapRoleToUserRole(loginUser.role || 'employee'),
      autoApproval: loginUser.autoApproval,
      department: loginUser.department,
      timezone: loginUser.timezone,
      language: loginUser.language,
    };
  };

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authService.checkHealth();
      const status = (response as { data?: { status?: string }; status?: string }).data?.status 
        || (response as { status?: string }).status;
      return status === 'ok' || status === 'healthy';
    } catch (error) {
      return false;
    }
  }, []);

  const isTokenValid = useCallback(async (): Promise<boolean> => {
    try {
      const tokensJson = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (!tokensJson) return false;
      
      const tokens: StoredTokens = JSON.parse(tokensJson);
      const bufferTime = 5 * 60 * 1000;
      return tokens.expiresAt > Date.now() + bufferTime;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleWebHashTokens = async (): Promise<boolean> => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return false;
      }

      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) {
        return false;
      }

      console.log('[AuthContext] Detected auth tokens in URL hash');
      const parsed = parseAuthHashFragment(hash);

      if (parsed.error) {
        console.error('[AuthContext] Error in hash:', parsed.error);
        clearUrlHash();
        return false;
      }

      if (!parsed.accessToken) {
        console.log('[AuthContext] No access token in hash');
        clearUrlHash();
        return false;
      }

      try {
        console.log('[AuthContext] Processing SSO tokens from URL hash');
        
        setAccessToken(parsed.accessToken);
        const refreshTokenValue = parsed.refreshToken || parsed.accessToken;
        setRefreshToken(refreshTokenValue);

        await persistTokens(parsed.accessToken, refreshTokenValue, parsed.expiresIn);

        const userDto = await authService.getCurrentUser();
        const user = mapUserDtoToAuthUser(userDto);
        user.isSSOUser = true;
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        clearUrlHash();
        console.log('[AuthContext] SSO login successful');

        if (Platform.OS !== 'web') {
          pushNotificationService.initialize().catch((pushError) => {
            console.warn('[AuthContext] Failed to initialize push notifications:', pushError);
          });
        }

        crashlyticsService.setUserAttributes({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }).catch((crashlyticsError) => {
          console.warn('[AuthContext] Failed to set crashlytics user attributes:', crashlyticsError);
        });

        return true;
      } catch (error) {
        console.error('[AuthContext] Error processing hash tokens:', error);
        clearTokens();
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
        clearUrlHash();
        return false;
      }
    };

    const initializeAuth = async () => {
      try {
        const handledHash = await handleWebHashTokens();
        if (handledHash) {
          return;
        }

        const tokensJson = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (tokensJson) {
          const tokens: StoredTokens = JSON.parse(tokensJson);
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);

          try {
            const storedUserJson = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
            const storedUser = storedUserJson ? JSON.parse(storedUserJson) : null;
            
            const userDto = await authService.getCurrentUser();
            const user = mapUserDtoToAuthUser(userDto);
            
            if (storedUser?.isSSOUser) {
              user.isSSOUser = true;
            }
            
            setState({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

            if (Platform.OS !== 'web') {
              pushNotificationService.initialize().catch((pushError) => {
                console.warn('[AuthContext] Failed to initialize push notifications:', pushError);
              });
            }

            crashlyticsService.setUserAttributes({
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            }).catch((crashlyticsError) => {
              console.warn('[AuthContext] Failed to set crashlytics user attributes:', crashlyticsError);
            });
          } catch (error) {
            await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
            clearTokens();
            setState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
              error: null,
            });
          }
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } catch (error) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to initialize authentication',
        });
      }
    };

    initializeAuth();
  }, [persistTokens]);

  const handleTokenResponse = useCallback(async (response: AuthTokenResponse) => {
    console.log('[AuthContext] Processing token response, has user:', !!response?.user);
    
    // Handle case where user might be at root level of response (API format variation)
    const userData = response.user || (response as unknown as { id?: string; email?: string });
    const user = mapLoginUserToAuthUser(userData as AuthTokenResponse['user']);
    
    if (!user) {
      console.error('[AuthContext] Invalid user data received from server. Response keys:', Object.keys(response || {}));
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Invalid user data received from server',
      });
      throw new Error('Invalid user data received from server');
    }
    
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);

    await persistTokens(response.accessToken, response.refreshToken, response.expiresIn);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    if (Platform.OS !== 'web') {
      pushNotificationService.initialize().catch((error) => {
        console.warn('[AuthContext] Failed to initialize push notifications:', error);
      });
    }

    crashlyticsService.setUserAttributes({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }).catch((error) => {
      console.warn('[AuthContext] Failed to set crashlytics user attributes:', error);
    });

    // Sync language preference from server
    if (user.language && onUserLanguageChanged) {
      console.log('[AuthContext] User language from server:', user.language);
      onUserLanguageChanged(user.language);
    }

    return response;
  }, [persistTokens, onUserLanguageChanged]);

  const login = useCallback(async (email: string, password: string): Promise<AuthTokenResponse> => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      const response = await authService.login(email, password);
      return await handleTokenResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [handleTokenResponse]);

  const azureLogin = useCallback(async (azureToken: string): Promise<AuthTokenResponse> => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      const response = await authService.azureLogin(azureToken);
      return await handleTokenResponse(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Azure login failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [handleTokenResponse]);

  const ssoLogin = useCallback(async (tokens: SSOTokens): Promise<AuthUser> => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      console.log('[AuthContext] ssoLogin called, token length:', tokens.accessToken?.length || 0);
      
      if (!tokens.accessToken) {
        throw new Error('No access token provided');
      }

      setAccessToken(tokens.accessToken);
      
      const refreshTokenValue = tokens.refreshToken || tokens.accessToken;
      setRefreshToken(refreshTokenValue);

      console.log('[AuthContext] Tokens set, persisting...');
      await persistTokens(tokens.accessToken, refreshTokenValue, tokens.expiresIn);

      console.log('[AuthContext] Fetching current user from API...');
      console.log('[AuthContext] Using access token (first 20 chars):', tokens.accessToken?.substring(0, 20));
      let userDto;
      try {
        userDto = await authService.getCurrentUser();
        console.log('[AuthContext] User fetched successfully:', userDto?.email);
      } catch (userFetchError) {
        console.error('[AuthContext] Failed to fetch current user:', userFetchError);
        console.error('[AuthContext] User fetch error details:', {
          name: userFetchError instanceof Error ? userFetchError.name : 'Unknown',
          message: userFetchError instanceof Error ? userFetchError.message : String(userFetchError),
          code: (userFetchError as any)?.code,
          status: (userFetchError as any)?.status,
          response: (userFetchError as any)?.response,
        });
        throw userFetchError;
      }
      
      const user = mapUserDtoToAuthUser(userDto);
      user.isSSOUser = true;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      console.log('[AuthContext] SSO login complete, user:', user.email, 'role:', user.role);

      if (Platform.OS !== 'web') {
        pushNotificationService.initialize().catch((pushError) => {
          console.warn('[AuthContext] Failed to initialize push notifications:', pushError);
        });
      }

      crashlyticsService.setUserAttributes({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch((crashlyticsError) => {
        console.warn('[AuthContext] Failed to set crashlytics user attributes:', crashlyticsError);
      });

      // Sync language preference from server
      if (user.language && onUserLanguageChanged) {
        console.log('[AuthContext] SSO User language from server:', user.language);
        onUserLanguageChanged(user.language);
      }

      return user;
    } catch (error) {
      console.error('[AuthContext] ssoLogin error:', error);
      clearTokens();
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
      const errorMessage = error instanceof Error ? error.message : 'SSO login failed';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [persistTokens, onUserLanguageChanged]);

  const logout = useCallback(async () => {
    await handleLogout();
  }, [handleLogout]);

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const userDto = await authService.getCurrentUser();
      const user = mapUserDtoToAuthUser(userDto);
      
      if (state.user?.isSSOUser) {
        user.isSSOUser = true;
      }
      
      setState((prev) => ({ ...prev, user }));
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
    }
  }, [state.isAuthenticated, state.user?.isSSOUser]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    azureLogin,
    ssoLogin,
    logout,
    refreshUser,
    clearError,
    checkHealth,
    isTokenValid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
