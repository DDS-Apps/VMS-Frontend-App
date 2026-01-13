import { pushNotificationService } from './pushNotificationService';
import { queryClient } from '@/providers/QueryProvider';

pushNotificationService.setQueryClient(queryClient);

export { pushNotificationService, pushNotificationService as default };
