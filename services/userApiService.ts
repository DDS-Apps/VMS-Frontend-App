import { get, post, put, del } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { PaginatedResponse } from '@/types';
import type {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  UserRole,
  AdminUserDto,
  AdminUserListParams,
  AdminUserPaginatedResponse,
} from '@/types/api.types';

const { users } = apiConfig.endpoints;

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  department?: string;
  search?: string;
  isActive?: boolean;
}

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const userApiService = {
  // Admin user list endpoint (GET /api/v1/users) - requires building_admin role
  listAdmin: (params?: AdminUserListParams): Promise<AdminUserPaginatedResponse> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<AdminUserPaginatedResponse>(`${users.base}${queryString}`);
  },

  // Admin get user by ID endpoint (GET /api/v1/users/{id}) - requires building_admin role
  getAdminById: (id: string): Promise<AdminUserDto> => {
    return get<AdminUserDto>(users.byId(id));
  },

  // Legacy list (kept for backward compatibility)
  list: (params?: ListUsersParams): Promise<PaginatedResponse<UserDto>> => {
    const queryString = params ? buildQueryString(params as unknown as Record<string, unknown>) : '';
    return get<PaginatedResponse<UserDto>>(`${users.base}${queryString}`);
  },

  getById: (id: string): Promise<UserDto> => {
    return get<UserDto>(users.byId(id));
  },

  create: (data: CreateUserDto): Promise<AdminUserDto> => {
    return post<AdminUserDto, CreateUserDto>(users.base, data);
  },

  update: (id: string, data: UpdateUserDto): Promise<AdminUserDto> => {
    return put<AdminUserDto, UpdateUserDto>(users.byId(id), data);
  },

  delete: (id: string): Promise<void> => {
    return del<void>(users.byId(id));
  },

  getManagers: (): Promise<UserDto[]> => {
    return get<UserDto[]>(users.managers);
  },

  getOnVacation: (): Promise<UserDto[]> => {
    return get<UserDto[]>(users.onVacation);
  },

  getByRole: (role: UserRole): Promise<UserDto[]> => {
    return get<UserDto[]>(users.byRole(role));
  },

  getTeam: (managerId: string): Promise<UserDto[]> => {
    return get<UserDto[]>(users.team(managerId));
  },
};

export default userApiService;
