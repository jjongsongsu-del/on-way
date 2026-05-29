export const SAILING_STATUS = {
  NORMAL: 'NORMAL',
  SCHEDULED: 'SCHEDULED',
  DELAYED: 'DELAYED',
  CANCELED: 'CANCELED',
  CONTROLLED: 'CONTROLLED',
  COMPLETED: 'COMPLETED',
  UNKNOWN: 'UNKNOWN'
} as const;

export type SailingStatus = (typeof SAILING_STATUS)[keyof typeof SAILING_STATUS];

export const SAILING_STATUS_LABEL: Record<SailingStatus, string> = {
  NORMAL: '정상 운항',
  SCHEDULED: '운항 예정',
  DELAYED: '지연',
  CANCELED: '결항',
  CONTROLLED: '통제',
  COMPLETED: '운항 완료',
  UNKNOWN: '정보 없음'
};
