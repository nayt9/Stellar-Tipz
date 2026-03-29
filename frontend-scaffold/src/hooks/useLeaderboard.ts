import { useState, useEffect, useCallback, useRef } from "react";

import { useContract } from "./useContract";
import { LeaderboardEntry } from "../types/contract";

const REFETCH_INTERVAL_MS = 60_000; // 60 seconds
const CACHE_KEY = "leaderboard_cache";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  entries: LeaderboardEntry[];
  timestamp: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches leaderboard data from the contract and keeps it fresh.
 *
 * Behaviour:
 * - Fetches top 50 creators sorted by total tips received (descending).
 * - Polls every 60 seconds for live updates.
 * - Preserves the previous (stale) data while a background refetch is in
 *   progress so the UI never shows an empty state during polling (optimistic UI).
 * - Caches data in sessionStorage to prevent re-fetch on page revisit
 *   (cache expires after 5 minutes).
 */
export const useLeaderboard = (): LeaderboardData => {
  const { getLeaderboard } = useContract();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs avoid stale closure issues inside the polling callback.
  const hasDataRef = useRef(false);
  const isFetchingRef = useRef(false);

  /**
   * Load cached data from sessionStorage if available and not expired.
   */
  const loadFromCache = useCallback((): LeaderboardEntry[] | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { entries: cachedEntries, timestamp }: CacheData =
        JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_DURATION_MS;

      if (isExpired) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }

      return cachedEntries;
    } catch {
      // If cache is corrupted, remove it
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  /**
   * Save data to sessionStorage with current timestamp.
   */
  const saveToCache = useCallback((data: LeaderboardEntry[]): void => {
    try {
      const cacheData: CacheData = {
        entries: data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Silently fail if sessionStorage is unavailable (e.g., private browsing)
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    // Only show the full spinner on the very first fetch (no cached data yet).
    if (!hasDataRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const fetchedEntries = await getLeaderboard(50);

      setEntries(fetchedEntries);
      hasDataRef.current = true;
      saveToCache(fetchedEntries);
    } catch (err) {
      // Network / contract failure — preserve stale data (optimistic UI).
      setError(
        err instanceof Error ? err.message : "Failed to fetch leaderboard data",
      );
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [getLeaderboard, saveToCache]);

  // Initial fetch: try cache first, then fetch from contract
  useEffect(() => {
    const cachedEntries = loadFromCache();

    if (cachedEntries) {
      // Use cached data immediately
      setEntries(cachedEntries);
      hasDataRef.current = true;
      // Fetch fresh data in the background
      fetchLeaderboard();
    } else {
      // No cache, fetch immediately
      fetchLeaderboard();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling interval — 60 s for live updates.
  useEffect(() => {
    const id = setInterval(() => {
      fetchLeaderboard();
    }, REFETCH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  const refetch = useCallback(() => {
    // Clear cache and force a fresh fetch
    sessionStorage.removeItem(CACHE_KEY);
    hasDataRef.current = false;
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, error, refetch };
};
