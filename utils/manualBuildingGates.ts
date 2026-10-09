import { ApiException } from '@/api/errors';

// Compatibility filter for explicit Security operator assertions only.
// Never use these lists to classify incoming Matrix/provider events.
const genericBuildingIds = ['main', 'gate_main_entrance', 'gate_side_entrance', 'gate_vip'];
const manualIds = {
  check_in: [...genericBuildingIds, 'd_2', 'd_3', 'd_6', 'd_7'],
  check_out: [...genericBuildingIds, 'd_1', 'd_4', 'd_5', 'd_8'],
} as const;

export function isManualBuildingGateAllowed(action: keyof typeof manualIds, gateId: string): boolean {
  return manualIds[action].includes(gateId);
}

export function assertManualBuildingGate(action: keyof typeof manualIds, gateId: string): void {
  if (!isManualBuildingGateAllowed(action, gateId)) {
    throw new ApiException({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'This reader is not supported for the requested building action.',
    });
  }
}
