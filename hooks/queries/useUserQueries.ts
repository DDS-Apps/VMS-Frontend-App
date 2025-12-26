import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApiService, type ListUsersParams } from '@/services/userApiService';
import type { 
  UserDto, 
  CreateUserDto, 
  UpdateUserDto, 
  UserRole,
  AdminUserDto,
  AdminUserListParams,
  AdminUserPaginatedResponse,
} from '@/types/api.types';
import type { PaginatedResponse } from '@/types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: ListUsersParams) => [...userKeys.lists(), params] as const,
  adminLists: () => [...userKeys.all, 'admin-list'] as const,
  adminList: (params?: AdminUserListParams) => [...userKeys.adminLists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  adminDetails: () => [...userKeys.all, 'admin-detail'] as const,
  adminDetail: (id: string) => [...userKeys.adminDetails(), id] as const,
  managers: () => [...userKeys.all, 'managers'] as const,
  onVacation: () => [...userKeys.all, 'on-vacation'] as const,
  byRole: (role: UserRole) => [...userKeys.all, 'by-role', role] as const,
  team: (managerId: string) => [...userKeys.all, 'team', managerId] as const,
};

// Admin user list query (GET /api/v1/users) - requires building_admin role
export function useAdminUsersQuery(params?: AdminUserListParams, enabled = true) {
  return useQuery<AdminUserPaginatedResponse>({
    queryKey: userKeys.adminList(params),
    queryFn: () => userApiService.listAdmin(params),
    enabled,
  });
}

// Admin get user by ID query (GET /api/v1/users/{id}) - requires building_admin role
export function useAdminUserQuery(id: string, enabled = true) {
  return useQuery<AdminUserDto>({
    queryKey: userKeys.adminDetail(id),
    queryFn: () => userApiService.getAdminById(id),
    enabled: enabled && !!id,
  });
}

// Legacy user list query (kept for backward compatibility)
export function useUsersQuery(params?: ListUsersParams, enabled = true) {
  return useQuery<PaginatedResponse<UserDto>>({
    queryKey: userKeys.list(params),
    queryFn: () => userApiService.list(params),
    enabled,
  });
}

export function useUserQuery(id: string, enabled = true) {
  return useQuery<UserDto>({
    queryKey: userKeys.detail(id),
    queryFn: () => userApiService.getById(id),
    enabled: enabled && !!id,
  });
}

export function useManagersQuery() {
  return useQuery<UserDto[]>({
    queryKey: userKeys.managers(),
    queryFn: () => userApiService.getManagers(),
  });
}

export function useUsersOnVacationQuery() {
  return useQuery<UserDto[]>({
    queryKey: userKeys.onVacation(),
    queryFn: () => userApiService.getOnVacation(),
  });
}

export function useUsersByRoleQuery(role: UserRole, enabled = true) {
  return useQuery<UserDto[]>({
    queryKey: userKeys.byRole(role),
    queryFn: () => userApiService.getByRole(role),
    enabled,
  });
}

export function useTeamQuery(managerId: string, enabled = true) {
  return useQuery<UserDto[]>({
    queryKey: userKeys.team(managerId),
    queryFn: () => userApiService.getTeam(managerId),
    enabled: enabled && !!managerId,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserDto, Error, CreateUserDto>({
    mutationFn: (data) => userApiService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.adminLists() });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserDto, Error, { id: string; data: UpdateUserDto }>({
    mutationFn: ({ id, data }) => userApiService.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(userKeys.adminDetail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.adminLists() });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => {
      console.log('[useDeleteUserMutation] Deleting user with ID:', id);
      return userApiService.delete(id);
    },
    onSuccess: (_, id) => {
      console.log('[useDeleteUserMutation] Successfully deleted user:', id);
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.removeQueries({ queryKey: userKeys.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.adminLists() });
    },
    onError: (error, id) => {
      console.error('[useDeleteUserMutation] Failed to delete user:', id, error);
    },
  });
}
