import { useState, useCallback } from 'react';

/**
 * useApi Hook - Generic hook for making API calls with loading and error states
 * 
 * Usage:
 * const { data, loading, error, call } = useApi();
 * 
 * const doctors = await call(() => doctorAPI.getAll());
 */

export function useApi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = useCallback(async (apiFunction) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFunction();
      
      if (response.success) {
        setData(response.data);
        return response.data;
      } else {
        const errorMsg = response.error || 'API call failed';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, call, reset, setData, setError };
}

export default useApi;
