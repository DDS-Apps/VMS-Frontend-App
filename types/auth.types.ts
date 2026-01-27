export interface LoginPayload {
  email: string;
  password: string;
}

export interface AzureLoginPayload {
  token: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export type UserSource = 'microsoft_ad' | 'local' | 'sso';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  phoneNumber?: string;
  businessPhone?: string;
  status: 'active' | 'inactive';
  autoApproval: boolean;
  source?: UserSource;
  managerId?: string | null;
  managerName?: string | null;
  createdAt: string;
  lastLogin?: string;
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  timezone?: string;
  language?: 'en' | 'ar';
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    department?: string;
    autoApproval?: boolean;
    timezone?: string;
    language?: 'en' | 'ar';
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthConfigResponse {
  azureEnabled: boolean;
  passwordEnabled: boolean;
  biometricEnabled: boolean;
  mfaEnabled: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  department?: string;
  language?: 'en' | 'ar';
}

export interface PhotoUploadResponse {
  photoUrl: string;
  thumbnailUrl: string;
  uploadedAt: string;
}

export interface PhotoDeleteResponse {
  message: string;
  photoUrl: null;
}

export type BiometricPlatform = 'ios' | 'android';

export type BiometricType = 'fingerprint' | 'face' | 'iris';

export interface BiometricRegisterPayload {
  publicKey: string;
  deviceId: string;
  deviceName: string;
  platform: BiometricPlatform;
  biometricType: BiometricType;
}

export interface BiometricDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: BiometricPlatform;
  biometricType: BiometricType;
  lastUsedAt?: string;
  createdAt: string;
}

export interface BiometricVerifyPayload {
  signature: string;
  deviceId: string;
  challenge: string;
}

export interface BiometricChallengeResponse {
  challenge: string;
  expiresAt: string;
}

export interface BiometricSettings {
  enabled: boolean;
  allowedDevices: number;
  requireReauthAfterDays: number;
}

export interface UpdateBiometricSettingsPayload {
  enabled?: boolean;
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    version: string;
    environment: string;
  };
  timestamp: string;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
