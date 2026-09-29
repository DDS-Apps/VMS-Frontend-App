import { isOperationalVisitVisible } from './operationalVisitVisibility';

describe('operational visit confirmation', () => {
  it.each([
    ['pending', false],
    ['pending_host_approval', false],
    ['visitor_pending', false],
    ['waiting_acceptance', false],
    ['approved', false],
    ['expected', false],
    ['visitor_rejected', false],
    ['cancelled', false],
    ['visitor_accepted', true],
    ['accepted', true],
    ['checked_in', true],
    ['on_site', true],
    ['checked_out', true],
    ['completed', true],
  ])('treats scheduled status %s as visible: %s', (status, visible) => {
    expect(isOperationalVisitVisible({ status, isWalkIn: false })).toBe(visible);
  });

  it('admits only approved or later walk-ins', () => {
    expect(isOperationalVisitVisible({ status: 'approved', isWalkIn: true })).toBe(true);
    expect(isOperationalVisitVisible({ status: 'pending_host_approval', isWalkIn: true })).toBe(false);
    expect(isOperationalVisitVisible({ status: 'rejected', isWalkIn: true })).toBe(false);
    expect(isOperationalVisitVisible({ status: 'approved' })).toBe(false);
  });
});