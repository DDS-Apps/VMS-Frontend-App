import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/api/httpClient';
import { apiConfig } from '@/api/config';
import type { ReminderRules } from '@/types/vms.types';

export interface UpdateReminderRulesPayload {
  firstReminderDelayMinutes?: number;
  secondReminderDelayMinutes?: number;
  autoCancelDelayMinutes?: number;
  officeStartTime?: string;
  officeEndTime?: string;
  workingDays?: number[];
  isActive?: boolean;
}

export const adminKeys = {
  all: ['admin'] as const,
  reminderRules: () => [...adminKeys.all, 'reminder-rules'] as const,
};

async function getReminderRules(): Promise<ReminderRules> {
  const response = await httpClient.get<ReminderRules>(apiConfig.endpoints.admin.reminderRules);
  return response.data;
}

async function updateReminderRules(payload: UpdateReminderRulesPayload): Promise<ReminderRules> {
  const response = await httpClient.put<ReminderRules>(apiConfig.endpoints.admin.reminderRules, payload);
  return response.data;
}

export function useReminderRulesQuery(enabled = true) {
  return useQuery<ReminderRules>({
    queryKey: adminKeys.reminderRules(),
    queryFn: getReminderRules,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useUpdateReminderRulesMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReminderRules, Error, UpdateReminderRulesPayload>({
    mutationFn: updateReminderRules,
    onSuccess: (data) => {
      queryClient.setQueryData(adminKeys.reminderRules(), data);
    },
  });
}
