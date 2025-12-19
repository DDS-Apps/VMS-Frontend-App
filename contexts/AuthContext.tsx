import React, { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  setAccessToken, 
  setRefreshToken, 
  clearTokens, 
  setOnTokenRefreshFailed,
  setOnTokenRefreshed,
  getRefreshToken,
} from '@/api/httpClient';
import { authService } from '@/services/authService';
import type { AuthTokenResponse, StoredTokens, AuthUserDto } from '@/types/auth.types';
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
}

export function AuthProvider({ children, onLogout }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  const handleLogout = useCallback(async () => {
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

  const VALID_ROLES: UserRole[] = [
    'employee', 'manager', 'building_admin', 'buffet_admin', 'buffet_staff',
    'valet_admin', 'valet_driver', 'security', 'visitor', 'receptionist'
  ];

  const mapRoleToUserRole = (role: string): UserRole => {
    if (VALID_ROLES.includes(role as UserRole)) {
      return role as UserRole;
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
    };
  };

  const mapLoginUserToAuthUser = (loginUser: AuthTokenResponse['user']): AuthUser => {
    return {
      id: loginUser.id,
      email: loginUser.email,
      name: loginUser.name,
      role: mapRoleToUserRole(loginUser.role),
      autoApproval: loginUser.autoApproval,
      department: loginUser.department,
    };
  };

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authService.checkHealth();
      const status = response.data?.status || (response as any).status;
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
    const initializeAuth = async () => {
      try {
        const tokensJson = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        
        if (tokensJson) {
          const tokens: StoredTokens = JSON.parse(tokensJson);
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);

          try {
            const userDto = await authService.getCurrentUser();
            const user = mapUserDtoToAuthUser(userDto);
            setState({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
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
  }, []);

  const handleTokenResponse = useCallback(async (response: AuthTokenResponse) => {
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);

    await persistTokens(response.accessToken, response.refreshToken, response.expiresIn);
    
    const user = mapLoginUserToAuthUser(response.user);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

    setState({
      user,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    });

    return response;
  }, [persistTokens]);

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
      setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) {
        setRefreshToken(tokens.refreshToken);
      }

      await persistTokens(tokens.accessToken, tokens.refreshToken || '', tokens.expiresIn);

      const userDto = await authService.getCurrentUser();
      const user = mapUserDtoToAuthUser(userDto);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

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
  }, [persistTokens]);

  const logout = useCallback(async () => {
    await handleLogout();
  }, [handleLogout]);

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;

    try {
      const userDto = await authService.getCurrentUser();
      const user = mapUserDtoToAuthUser(userDto);
      setState((prev) => ({ ...prev, user }));
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
    }
  }, [state.isAuthenticated]);

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
