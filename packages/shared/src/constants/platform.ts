export const PLATFORM = {
  IOS: 'IOS',
  ANDROID: 'ANDROID',
  WEB: 'WEB',
  UNKNOWN: 'UNKNOWN'
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

