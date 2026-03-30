/** Profile data from the Tipz contract */
export interface Profile {
  owner: string;
  username: string;
  displayName: string;
  bio: string;
  imageUrl: string;
  xHandle: string;
  xFollowers: number;
  xEngagementAvg: number;
  creditScore: number;
  totalTipsReceived: string; // i128 as string
  totalTipsCount: number;
  balance: string; // i128 as string
  registeredAt: number;
  updatedAt: number;
}

/** Tip record from the contract */
export interface Tip {
  id: number;
  tipper: string;
  creator: string;
  amount: string; // i128 as string
  message: string;
  timestamp: number;
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  address: string;
  username: string;
  totalTipsReceived: string;
  creditScore: number;
}

/** Global contract statistics */
export interface ContractStats {
  totalCreators: number;
  totalTipsCount: number;
  totalTipsVolume: string;
  totalFeesCollected: string;
  feeBps: number;
}

/** Credit score tiers */
export type CreditTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export const getCreditTier = (score: number): CreditTier => {
  if (score >= 901) return 'diamond';
  if (score >= 701) return 'gold';
  if (score >= 401) return 'silver';
  return 'bronze';
};
