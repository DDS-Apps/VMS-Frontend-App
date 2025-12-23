import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_SERVER_TIMEZONE } from '@/services/utils/dateTimeUtils';

/**
 * Hook to get the server timezone from the authenticated user
 * Falls back to Asia/Riyadh if not available
 */
export function useServerTimezone(): string {
  const { user } = useAuth();
  return user?.timezone || DEFAULT_SERVER_TIMEZONE;
}
