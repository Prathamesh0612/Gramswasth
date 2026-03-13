import { useState, useCallback } from 'react';
import { authAPI } from '../services/api';

/**
 * useAuth Hook - Manages authentication state and API calls
 * 
 * Usage:
 * const { user, token, loading, error, login, logout } = useAuth();
 * 
 * Login:
 * await login({ phone: '9876543210', password: 'pass123' });
 */

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setToken(newToken);
        setUser(userData);
        
        return { success: true, data: userData };
      } else {
        const errorMsg = response.error || 'Login failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authAPI.logout();
      
      // Clear state
      setUser(null);
      setToken(null);
      setError(null);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Logout error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.register(userData);
      
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error || 'Registration failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || 'Network error';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!token && !!user;

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
    setError,
  };
}

export default useAuth;
