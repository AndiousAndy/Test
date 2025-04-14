export const MATCH_STATUS = {
  OPEN: 'OPEN',
  WAITING_OPPONENT: 'WAITING_OPPONENT', // If you use this status
  WAITING_START: 'WAITING_START', // Added status for when both players joined but before scheduled time
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED',
  CANCELLED_BY_HOST: 'CANCELLED_BY_HOST',
  CANCELLED_EXPIRED: 'CANCELLED_EXPIRED', // Automatically cancelled because no opponent joined in time
  CANCELLED_BY_ADMIN: 'CANCELLED_BY_ADMIN', // Added status for admin cancellations
} as const; // Use 'as const' for stricter typing

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];
