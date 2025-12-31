import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { authService } from '@/services/api/authService';
import type {
  AuthConfigResponse,
  AuthUserDto,
  AuthTokenResponse,
  ChangePasswordPayload,
  BiometricRegisterPayload,
  BiometricDevice,
  BiometricVerifyPayload,
  BiometricSettings,
  UpdateBiometricSettingsPayload,
} from '@/types';
import { ApiError } from '@/api/errors';

export const authKeys = {
  all: ['auth'] as const,
  config: () => [...authKeys.all, 'config'] as const,
  currentUser: () => [...authKeys.all, 'me'] as const,
  biometricDevices: () => [...authKeys.all, 'biometric', 'devices'] as const,
  biometricSettings: () => [...authKeys.all, 'biometric', 'settings'] as const,
  biometricChallenge: () => [...authKeys.all, 'biometric', 'challenge'] as const,
};

export function useAuthConfigQuery(
  options?: Omit<UseQueryOptions<AuthConfigResponse, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AuthConfigResponse, ApiError>({
    queryKey: authKeys.config(),
    queryFn: () => authService.getConfig(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCurrentUserQuery(
  enabled = true,
  options?: Omit<UseQueryOptions<AuthUserDto, ApiError>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<AuthUserDto, ApiError>({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useBiometricDevicesQuery(
  options?: Omit<UseQueryOptions<BiometricDevice[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<BiometricDevice[], ApiError>({
    queryKey: authKeys.biometricDevices(),
    queryFn: () => authService.getBiometricDevices(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBiometricSettingsQuery(
  options?: Omit<UseQueryOptions<BiometricSettings, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<BiometricSettings, ApiError>({
    queryKey: authKeys.biometricSettings(),
    queryFn: () => authService.getBiometricSettings(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBiometricChallengeQuery(
  enabled = false,
  options?: Omit<UseQueryOptions<{ challenge: string; expiresAt: string }, ApiError>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useQuery<{ challenge: string; expiresAt: string }, ApiError>({
    queryKey: authKeys.biometricChallenge(),
    queryFn: () => authService.getBiometricChallenge(),
    enabled,
    staleTime: 0,
    gcTime: 0,
    ...options,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthTokenResponse, ApiError, { email: string; password: string }>({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

export function useAzureLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthTokenResponse, ApiError, string>({
    mutationFn: (azureToken) => authService.azureLogin(azureToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string | undefined>({
    mutationFn: (refreshToken) => {
      if (!refreshToken) {
        return Promise.resolve();
      }
      return authService.logout(refreshToken);
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation<{ message: string }, ApiError, ChangePasswordPayload>({
    mutationFn: (payload) => authService.changePassword(payload),
  });
}

export function useRegisterBiometricMutation() {
  const queryClient = useQueryClient();

  return useMutation<BiometricDevice, ApiError, BiometricRegisterPayload>({
    mutationFn: (payload) => authService.registerBiometric(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.biometricDevices() });
    },
  });
}

export function useRemoveBiometricDeviceMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (deviceId) => authService.removeBiometricDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.biometricDevices() });
    },
  });
}

export function useVerifyBiometricMutation() {
  const queryClient = useQueryClient();

  return useMutation<AuthTokenResponse, ApiError, BiometricVerifyPayload>({
    mutationFn: (payload) => authService.verifyBiometric(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

export function useUpdateBiometricSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation<BiometricSettings, ApiError, UpdateBiometricSettingsPayload>({
    mutationFn: (payload) => authService.updateBiometricSettings(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.biometricSettings(), data);
    },
  });
}
