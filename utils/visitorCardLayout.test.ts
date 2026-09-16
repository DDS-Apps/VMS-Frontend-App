import { getVisitorCardMetadataFlexWrap } from './visitorCardLayout';

describe('visitor card metadata layout', () => {
  it.each(['ios', 'android'])('wraps date and duration on %s', (platform) => {
    expect(getVisitorCardMetadataFlexWrap(platform)).toBe('wrap');
  });

  it('preserves the current single-row web layout', () => {
    expect(getVisitorCardMetadataFlexWrap('web')).toBe('nowrap');
  });
});