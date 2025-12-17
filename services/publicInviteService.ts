import axios from 'axios';
import { apiConfig } from '@/api/config';
import type {
  PublicInviteDto,
  AcceptInviteDto,
  RejectInviteDto,
  PublicInviteResponseDto,
} from '@/types/api.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

const publicAxios = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const { publicInvites } = apiConfig.endpoints;

export const publicInviteService = {
  getByToken: async (token: string): Promise<PublicInviteDto> => {
    const response = await publicAxios.get<ApiResponse<PublicInviteDto>>(publicInvites.byToken(token));
    return response.data.data;
  },

  accept: async (token: string, data?: AcceptInviteDto): Promise<PublicInviteResponseDto> => {
    const response = await publicAxios.post<ApiResponse<PublicInviteResponseDto>>(
      publicInvites.accept(token),
      data || {}
    );
    return response.data.data || response.data as unknown as PublicInviteResponseDto;
  },

  reject: async (token: string, data?: RejectInviteDto): Promise<PublicInviteResponseDto> => {
    const response = await publicAxios.post<ApiResponse<PublicInviteResponseDto>>(
      publicInvites.reject(token),
      data || {}
    );
    return response.data.data || response.data as unknown as PublicInviteResponseDto;
  },
};

export default publicInviteService;
