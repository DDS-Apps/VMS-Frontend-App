import { resolveParkingDisplayDecision } from './parkingDecision';

describe('resolveParkingDisplayDecision', () => {
  it.each([
    ['required', 'required'],
    ['parking_required', 'required'],
    ['not_required', 'not_required'],
    ['no_parking', 'not_required'],
  ] as const)('normalizes the explicit %s decision', (parkingDecision, expected) => {
    expect(resolveParkingDisplayDecision({ parkingDecision })).toBe(expected);
  });

  it('prioritizes an explicit decision over legacy allocation data', () => {
    expect(
      resolveParkingDisplayDecision({
        parkingDecision: 'not_required',
        hasParkingAllocation: true,
      }),
    ).toBe('not_required');
  });

  it('uses parking requirement flags when no explicit decision exists', () => {
    expect(resolveParkingDisplayDecision({ visitorNeedsParking: true })).toBe('required');
    expect(resolveParkingDisplayDecision({ isVisitorNeedsParking: false })).toBe('not_required');
  });

  it('uses allocation data only as a legacy fallback', () => {
    expect(resolveParkingDisplayDecision({ hasParkingAllocation: true })).toBe('required');
    expect(resolveParkingDisplayDecision({})).toBe('not_required');
  });
});