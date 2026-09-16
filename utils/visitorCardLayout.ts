export type VisitorCardPlatform = 'web' | 'ios' | 'android' | string;

export const getVisitorCardMetadataFlexWrap = (
  platform: VisitorCardPlatform,
): 'nowrap' | 'wrap' => platform === 'web' ? 'nowrap' : 'wrap';