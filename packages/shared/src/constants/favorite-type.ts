export const FAVORITE_TYPE = {
  ROUTE: 'ROUTE',
  VESSEL: 'VESSEL',
  TERMINAL: 'TERMINAL',
  PORT: 'PORT'
} as const;

export type FavoriteType = (typeof FAVORITE_TYPE)[keyof typeof FAVORITE_TYPE];

export const FAVORITE_TYPE_LABEL: Record<FavoriteType, string> = {
  ROUTE: '항로',
  VESSEL: '선박',
  TERMINAL: '터미널',
  PORT: '기항지'
};

