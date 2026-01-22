/**
 * Custom hooks for API data fetching
 * Will be expanded as features are added
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for fetching data from an async function
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Array} deps - Dependencies to trigger refetch
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, deps);

  return { data, loading, error, refetch };
}
