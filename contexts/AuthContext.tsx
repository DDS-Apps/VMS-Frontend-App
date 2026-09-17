import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  beginSession,
  setAccessToken, 
  setRefreshToken, 
  clearTokens, 
  setOnTokenRefreshFailed,
  setOnTokenRefreshed,
  getRefreshToken,
} from '@/api/httpClient';
import { authService } from '@/services/api/authService';
import { isUnauthorizedError } from '@/api/errors';
import { parseAuthHashFragment, clearUrlHash } from '@/utils/authTokenParser';
import { pushNotificationService } from '@/services/push';
import { crashlyticsService } from '@/services/crashlytics/crashlyticsService';
import type { AuthTokenResponse, StoredTokens, AuthUserDto } from '@/types/auth.types';
import { isValidRole } from '@/constants/roles';
import type { UserRole } from '@/types/vms.types';
import { queryClient } from '@/providers/QueryProvider';
import { dashboardKpiKeys } from '@/hooks/queries/useDashboardKpiQuery';

const AUTH_STORAGE_KEY = '@vms_auth';
const TOKEN_STORAGE_KEY = '@vms_tokens';
export const SESSION_EXPIRED_ERROR = 'SESSION_EXPIRED';

/**
 * Fields compared when deciding whether a freshly fetched profile differs from
 * the cached one restored at startup.
 */
const AUTH_USER_FIELDS: ReadonlyArray<keyof AuthUser> = [
  'id',
  'email',
  'name',
  'role',
  'autoApproval',
  'phoneNumber',
  'businessPhone',
  'department',
  'status',
  'source',
  'managerId',
  'managerName',
  'photoUrl',
  'thumbnailUrl',
  'createdAt',
  'lastLogin',
  'isSSOUser',
  'timezone',
  'language',
];

function isSameAuthUser(a: AuthUser, b: AuthUser): boolean {
  return AUTH_USER_FIELDS.every((field) => (a[field] ?? null) === (b[field] ?? null));
}

/**
 * A stored session is only abandoned when the server definitively rejects it.
 * By the time a 401 reaches this layer the http client has already tried the
 * refresh token and failed (or had none), so UNAUTHORIZED is the definitive
 * signal. Network errors, timeouts and server errors are not.
 */
function isDefinitiveAuthFailure(error: unknown): boolean {
  return isUnauthorizedError(error);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  autoApproval?: boolean;
  phoneNumber?: string;
  businessPhone?: string;
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
  userDataVersion: number;
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
  refreshUser: () => Promise<AuthUser | null>;
  clearError: () => void;
  checkHealth: () => Promise<boolean>;
  isTokenValid: () => Promise<boolean>;
  userDataVersion: number;
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
    userDataVersion: 0,
  });
  const previousKpiIdentityRef = useRef<string | null>(null);
  // Incremented whenever the signed-in identity changes (login, SSO, logout) so a
  // startup profile refresh that resolves late cannot overwrite a newer session.
  const sessionGenerationRef = useRef(0);
  // A refresh can fail for several requests at once. Only the first failure
  // may end the current session; later callbacks belong to the same epoch.
  const runtimeLogoutGenerationRef = useRef<number | null>(null);

  useEffect(() => {
    const currentIdentity = state.user
      ? `${state.user.id}:${state.user.role}`
      : null;
    const previousIdentity = previousKpiIdentityRef.current;

    if (previousIdentity && previousIdentity !== currentIdentity) {
      queryClient.removeQueries({
        queryKey: dashboardKpiKeys.byIdentity(previousIdentity),
      });
    }
    previousKpiIdentityRef.current = currentIdentity;
  }, [state.user?.id, state.user?.role]);

  const clearSessionLocally = useCallback((error: string | null) => {
    sessionGenerationRef.current += 1;
    runtimeLogoutGenerationRef.current = sessionGenerationRef.current;

    // These operations deliberately happen before any best-effort network
    // cleanup. A refresh failure must not leave a usable local session while
    // push registration or the logout request is still in flight.
    if (typeof (queryClient as { clear?: () => void }).clear === 'function') {
      queryClient.clear();
    } else {
      queryClient.removeQueries();
    }
    clearTokens();
    void AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]).catch(() => {
      // Local state and in-memory tokens are already cleared. A later launch
      // will retry the storage cleanup rather than exposing the old session.
    });
    setState((prev) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error,
      userDataVersion: prev.userDataVersion,
    }));
    onLogout?.();
  }, [onLogout]);

  const runLogoutCleanup = useCallback(async (refreshToken: string | null) => {
    await Promise.allSettled([
      pushNotificationService.unregister(),
      crashlyticsService.clearUserAttributes(),
      ...(refreshToken ? [authService.logout(refreshToken)] : []),
    ]);
  }, []);

  const handleLogout = useCallback(async () => {
    const currentRefreshToken = getRefreshToken();
    clearSessionLocally(null);
    await runLogoutCleanup(currentRefreshToken);
  }, [clearSessionLocally, runLogoutCleanup]);

  const handleRuntimeTokenRefreshFailed = useCallback(() => {
    const generation = sessionGenerationRef.current;
    if (runtimeLogoutGenerationRef.current === generation) {
      return;
    }

    // Do not await push unregister, Crashlytics, or the server logout here.
    // The transport invokes this callback from an interceptor and another
    // login may begin before those operations complete.
    clearSessionLocally(SESSION_EXPIRED_ERROR);
    void runLogoutCleanup(null);
  }, [clearSessionLocally, runLogoutCleanup]);

  const persistTokens = useCallback(async (newAccessToken: string, newRefreshToken: string, expiresIn?: number) => {
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 86400 * 1000;
    const tokens: StoredTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }, []);

  // The startup effect below runs once; it reaches the latest logout handler
  // through this ref instead of re-running whenever the callback identity changes.
  const handleLogoutRef = useRef(handleLogout);
  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  useEffect(() => {
    setOnTokenRefreshFailed(() => {
      handleRuntimeTokenRefreshFailed();
    });

    setOnTokenRefreshed((newAccessToken, newRefreshToken) => {
      persistTokens(newAccessToken, newRefreshToken);
    });

    return () => {
      setOnTokenRefreshFailed(null);
      setOnTokenRefreshed(null);
    };
  }, [handleRuntimeTokenRefreshFailed, persistTokens]);

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
      businessPhone: userDto.businessPhone,
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

  /**
   * Parses the profile persisted by a previous login/refresh. Returns null when
   * the entry is missing or unusable so callers fall back to a server fetch.
   */
  const parseStoredUser = (storedUserJson: string | null): AuthUser | null => {
    if (!storedUserJson) {
      return null;
    }

    try {
      const parsed = JSON.parse(storedUserJson) as Partial<AuthUser> | null;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      if (typeof parsed.id !== 'string' || !parsed.id || typeof parsed.email !== 'string' || !parsed.email) {
        return null;
      }

      return {
        ...parsed,
        id: parsed.id,
        email: parsed.email,
        name: typeof parsed.name === 'string' && parsed.name ? parsed.name : parsed.email.split('@')[0],
        role: mapRoleToUserRole(typeof parsed.role === 'string' ? parsed.role : 'employee'),
      };
    } catch {
      console.warn('[AuthContext] Ignoring unreadable cached user profile');
      return null;
    }
  };

  const mapLoginUserToAuthUser = (loginUser: AuthTokenResponse['user']): AuthUser | null => {
    if (!loginUser) {
      console.warn('[AuthContext] Received null/undefined user in token response');
      return null;
    }
    
    if (!loginUser.id || !loginUser.email) {
      console.warn('[AuthContext] User data missing required fields (id or email)');
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
        console.error('[AuthContext] Error in hash response');
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
        
        beginSession();
        sessionGenerationRef.current += 1;
        setAccessToken(parsed.accessToken);
        const refreshTokenValue = parsed.refreshToken || parsed.accessToken;
        setRefreshToken(refreshTokenValue);

        await persistTokens(parsed.accessToken, refreshTokenValue, parsed.expiresIn);

        const userDto = await authService.getCurrentUser();
        const user = mapUserDtoToAuthUser(userDto);
        user.isSSOUser = true;
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        setState((prev) => ({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
          userDataVersion: prev.userDataVersion,
        }));

        clearUrlHash();
        console.log('[AuthContext] SSO login successful');

        pushNotificationService.initialize().catch(() => {
          console.warn('[AuthContext] Failed to initialize push notifications');
        });

        crashlyticsService.setUserAttributes({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }).catch(() => {
          console.warn('[AuthContext] Failed to set crashlytics user attributes');
        });

        return true;
      } catch (error) {
        console.error('[AuthContext] Error processing hash tokens');
        clearTokens();
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
        clearUrlHash();
        return false;
      }
    };

    const setSignedOutState = () => {
      setState((prev) => ({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        userDataVersion: prev.userDataVersion,
      }));
    };

    const setSignedInState = (user: AuthUser) => {
      setState((prev) => ({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        userDataVersion: prev.userDataVersion,
      }));
    };

    const startSessionServices = (user: AuthUser) => {
      pushNotificationService.initialize().catch(() => {
        console.warn('[AuthContext] Failed to initialize push notifications');
      });

      crashlyticsService.setUserAttributes({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch(() => {
        console.warn('[AuthContext] Failed to set crashlytics user attributes');
      });
    };

    const isCurrentSession = (generation: number) => generation === sessionGenerationRef.current;

    /**
     * Refreshes the profile behind an already-restored session. Only a
     * definitive rejection signs the user out; anything else keeps the cached
     * session so a flaky network never bounces a returning user to Login.
     */
    const refreshStartupProfile = async (cachedUser: AuthUser, generation: number) => {
      try {
        const userDto = await authService.getCurrentUser({
          preserveSessionOnRefreshFailure: true,
        });
        if (!isCurrentSession(generation)) {
          return;
        }

        const freshUser = mapUserDtoToAuthUser(userDto);
        if (cachedUser.isSSOUser) {
          freshUser.isSSOUser = true;
        }

        if (isSameAuthUser(cachedUser, freshUser)) {
          return;
        }

        if (!isCurrentSession(generation)) {
          return;
        }
        setState((prev) => ({ ...prev, user: freshUser, userDataVersion: prev.userDataVersion + 1 }));
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshUser));
        if (!isCurrentSession(generation)) {
          return;
        }

        crashlyticsService.setUserAttributes({
          id: freshUser.id,
          email: freshUser.email,
          name: freshUser.name,
          role: freshUser.role,
        }).catch(() => {
          console.warn('[AuthContext] Failed to set crashlytics user attributes');
        });
      } catch (error) {
        if (!isCurrentSession(generation)) {
          // A token-refresh failure already signed this session out.
          return;
        }

        if (isDefinitiveAuthFailure(error)) {
          console.warn('[AuthContext] Stored session was rejected by the server, signing out');
          await handleLogoutRef.current();
          return;
        }

          console.warn('[AuthContext] Startup profile refresh failed, keeping cached session');
      }
    };

    const initializeAuth = async () => {
      try {
        const handledHash = await handleWebHashTokens();
        if (handledHash) {
          return;
        }

        const tokensJson = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (!tokensJson) {
          setSignedOutState();
          return;
        }

        const tokens: StoredTokens = JSON.parse(tokensJson);
        beginSession();
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);

        const cachedUser = parseStoredUser(await AsyncStorage.getItem(AUTH_STORAGE_KEY));
        const generation = sessionGenerationRef.current;

        if (cachedUser) {
          // Optimistic restore: the app renders from the cached profile right
          // away and the server copy is merged in behind it.
          setSignedInState(cachedUser);
          startSessionServices(cachedUser);
          await refreshStartupProfile(cachedUser, generation);
          return;
        }

        // Tokens without a usable cached profile: the first render has to wait
        // for the server, exactly as before.
        try {
          const userDto = await authService.getCurrentUser({
            preserveSessionOnRefreshFailure: true,
          });
          const user = mapUserDtoToAuthUser(userDto);

          setSignedInState(user);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          startSessionServices(user);
        } catch (error) {
          if (isDefinitiveAuthFailure(error)) {
            await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY]);
          } else {
            // Nothing to render from, so Login is shown, but the tokens stay
            // stored: a transient failure must not cost the user their session.
            console.warn('[AuthContext] Could not load the profile for the stored session');
          }
          clearTokens();
          setSignedOutState();
        }
      } catch (error) {
        setState((prev) => ({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: 'Failed to initialize authentication',
          userDataVersion: prev.userDataVersion,
        }));
      }
    };

    initializeAuth();
  }, [persistTokens]);

  const handleTokenResponse = useCallback(async (response: AuthTokenResponse) => {
    // Handle case where user might be at root level of response (API format variation)
    const userData = response.user || (response as unknown as { id?: string; email?: string });
    const user = mapLoginUserToAuthUser(userData as AuthTokenResponse['user']);
    
    if (!user) {
      console.error('[AuthContext] Invalid user data received from server');
      setState((prev) => ({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Invalid user data received from server',
        userDataVersion: prev.userDataVersion,
      }));
      throw new Error('Invalid user data received from server');
    }
    
    sessionGenerationRef.current += 1;
    beginSession();
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);

    await persistTokens(response.accessToken, response.refreshToken, response.expiresIn);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    setState((prev) => ({
      user,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      userDataVersion: prev.userDataVersion,
    }));

    pushNotificationService.initialize().catch(() => {
      console.warn('[AuthContext] Failed to initialize push notifications');
    });

    crashlyticsService.setUserAttributes({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }).catch(() => {
      console.warn('[AuthContext] Failed to set crashlytics user attributes');
    });

    // Sync language preference from server
    if (user.language && onUserLanguageChanged) {
      try {
        onUserLanguageChanged(user.language);
      } catch (langError) {
        console.warn('[AuthContext] Failed to sync user language preference');
      }
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
      if (!tokens.accessToken) {
        throw new Error('No access token provided');
      }

      sessionGenerationRef.current += 1;
      beginSession();
      setAccessToken(tokens.accessToken);
      
      const refreshTokenValue = tokens.refreshToken || tokens.accessToken;
      setRefreshToken(refreshTokenValue);

      await persistTokens(tokens.accessToken, refreshTokenValue, tokens.expiresIn);

      let userDto;
      try {
        userDto = await authService.getCurrentUser();
      } catch (userFetchError) {
        throw userFetchError;
      }
      
      const user = mapUserDtoToAuthUser(userDto);
      user.isSSOUser = true;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      setState((prev) => ({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        userDataVersion: prev.userDataVersion,
      }));

      pushNotificationService.initialize().catch(() => {
        console.warn('[AuthContext] Failed to initialize push notifications');
      });

      crashlyticsService.setUserAttributes({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch(() => {
        console.warn('[AuthContext] Failed to set crashlytics user attributes');
      });

      // Sync language preference from server
      if (user.language && onUserLanguageChanged) {
        try {
          onUserLanguageChanged(user.language);
        } catch (langError) {
          console.warn('[AuthContext] Failed to sync SSO user language preference');
        }
      }

      return user;
    } catch (error) {
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

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    if (!state.isAuthenticated) return null;

    try {
      const userDto = await authService.getCurrentUser();
      const user = mapUserDtoToAuthUser(userDto);
      
      if (state.user?.isSSOUser) {
        user.isSSOUser = true;
      }
      
      setState((prev) => ({ ...prev, user, userDataVersion: prev.userDataVersion + 1 }));
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (error) {
      // App focus refreshes are runtime auth checks. Any failure must end the
      // local session; the interceptor callback is guarded so this remains a
      // single sign-out when it already ran for the same request.
      handleRuntimeTokenRefreshFailed();
      return null;
    }
  }, [handleRuntimeTokenRefreshFailed, state.isAuthenticated, state.user?.isSSOUser]);

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
