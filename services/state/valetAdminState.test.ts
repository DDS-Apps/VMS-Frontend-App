import {
  driverParkVehicle,
  driverParkVehicleAutomatically,
  getAvailableParkingSlots,
  getParkingSlots,
  getValetRequestById,
  resetValetAdminState,
} from './valetAdminState';

describe('driver parking allocation', () => {
  beforeEach(() => {
    resetValetAdminState();
  });

  it('persists the slot selected by the allocation service', () => {
    const systemSelectedSlot = getAvailableParkingSlots()[0];

    const updatedRequest = driverParkVehicleAutomatically('vr_004');

    expect(updatedRequest).not.toBeNull();
    expect(updatedRequest?.status).toBe('parked');
    expect(updatedRequest?.parkingSlot).toBe(systemSelectedSlot.slotNumber);
    expect(getValetRequestById('vr_004')?.parkingSlot).toBe(systemSelectedSlot.slotNumber);
    expect(getParkingSlots().find(slot => slot.id === systemSelectedSlot.id)).toMatchObject({
      status: 'occupied',
      assignedRequest: 'vr_004',
    });
  });

  it('does not park a request into an unavailable slot', () => {
    expect(driverParkVehicle('vr_004', 'A-01')).toBeNull();
    expect(getValetRequestById('vr_004')?.status).toBe('pending');
    expect(getValetRequestById('vr_004')?.parkingSlot).toBeUndefined();
  });
});