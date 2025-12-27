import { get, post, put, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import {
  LoginPayload,
  AzureLoginPayload,
  RefreshTokenPayload,
  LogoutPayload,
  AuthUserDto,
  AuthTokenResponse,
  RefreshTokenResponse,
  AuthConfigResponse,
  SendOtpPayload,
  SendOtpResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
  ResendOtpPayload,
  ResendOtpResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ResetPasswordWithOtpPayload,
  ChangePasswordPayload,
  UpdateProfilePayload,
  PhotoUploadResponse,
  PhotoDeleteResponse,
  BiometricRegisterPayload,
  BiometricDevice,
  BiometricVerifyPayload,
  BiometricChallengeResponse,
  BiometricSettings,
  UpdateBiometricSettingsPayload,
  HealthCheckResponse,
} from '@/types';
import { httpClient } from '@/api/httpClient';

const { auth, users, health } = apiConfig.endpoints;

export const authService = {
  checkHealth: (): Promise<HealthCheckResponse> => {
    return get<HealthCheckResponse>(health);
  },

  getConfig: (): Promise<AuthConfigResponse> => {
    return get<AuthConfigResponse>(auth.config);
  },

  login: (email: string, password: string): Promise<AuthTokenResponse> => {
    return post<AuthTokenResponse, LoginPayload>(
      auth.login,
      { email, password }
    );
  },

  azureLogin: (azureToken: string): Promise<AuthTokenResponse> => {
    return post<AuthTokenResponse, AzureLoginPayload>(
      auth.azureLogin,
      { token: azureToken }
    );
  },

  refreshToken: (refreshToken: string): Promise<RefreshTokenResponse> => {
    return post<RefreshTokenResponse, RefreshTokenPayload>(
      auth.refresh,
      { refreshToken }
    );
  },

  logout: (refreshToken: string): Promise<void> => {
    return post<void, LogoutPayload>(auth.logout, { refreshToken });
  },

  getCurrentUser: (): Promise<AuthUserDto> => {
    return get<AuthUserDto>(users.me);
  },

  updateProfile: (payload: UpdateProfilePayload): Promise<AuthUserDto> => {
    return put<AuthUserDto, UpdateProfilePayload>(users.me, payload);
  },

  uploadPhoto: async (formData: FormData): Promise<PhotoUploadResponse> => {
    // Set Content-Type to undefined to override httpClient's default 'application/json'
    // This allows axios to auto-set 'multipart/form-data' with proper boundary
    const response = await httpClient.post<PhotoUploadResponse>(users.mePhoto, formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },

  deletePhoto: async (): Promise<PhotoDeleteResponse> => {
    const result = await del<PhotoDeleteResponse>(users.mePhoto);
    return result as PhotoDeleteResponse;
  },

  changePassword: (payload: ChangePasswordPayload): Promise<{ message: string }> => {
    return put<{ message: string }, ChangePasswordPayload>(auth.password, payload);
  },

  forgotPassword: (email: string): Promise<{ message: string }> => {
    return post<{ message: string }, ForgotPasswordPayload>(
      auth.forgotPassword,
      { email }
    );
  },

  resetPassword: (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    return post<{ message: string }, ResetPasswordPayload>(
      auth.resetPassword,
      payload
    );
  },

  resetPasswordWithOtp: (payload: ResetPasswordWithOtpPayload): Promise<{ message: string }> => {
    return post<{ message: string }, ResetPasswordWithOtpPayload>(
      auth.resetPasswordWithOtp,
      payload
    );
  },

  sendOtp: (payload: SendOtpPayload): Promise<SendOtpResponse> => {
    return post<SendOtpResponse, SendOtpPayload>(auth.sendOtp, payload);
  },

  verifyOtp: (payload: VerifyOtpPayload): Promise<VerifyOtpResponse> => {
    return post<VerifyOtpResponse, VerifyOtpPayload>(auth.verifyOtp, payload);
  },

  resendOtp: (payload: ResendOtpPayload): Promise<ResendOtpResponse> => {
    return post<ResendOtpResponse, ResendOtpPayload>(auth.resendOtp, payload);
  },

  registerBiometric: (payload: BiometricRegisterPayload): Promise<BiometricDevice> => {
    return post<BiometricDevice, BiometricRegisterPayload>(
      auth.biometric.register,
      payload
    );
  },

  getBiometricDevices: (): Promise<BiometricDevice[]> => {
    return get<BiometricDevice[]>(auth.biometric.devices);
  },

  removeBiometricDevice: (deviceId: string): Promise<void> => {
    return del<void>(`${auth.biometric.devices}/${deviceId}`);
  },

  verifyBiometric: (payload: BiometricVerifyPayload): Promise<AuthTokenResponse> => {
    return post<AuthTokenResponse, BiometricVerifyPayload>(
      auth.biometric.verify,
      payload
    );
  },

  getBiometricSettings: (): Promise<BiometricSettings> => {
    return get<BiometricSettings>(auth.biometric.settings);
  },

  updateBiometricSettings: (payload: UpdateBiometricSettingsPayload): Promise<BiometricSettings> => {
    return put<BiometricSettings, UpdateBiometricSettingsPayload>(
      auth.biometric.settings,
      payload
    );
  },

  getBiometricChallenge: (): Promise<BiometricChallengeResponse> => {
    return get<BiometricChallengeResponse>(auth.biometric.challenge);
  },
};

export default authService;
