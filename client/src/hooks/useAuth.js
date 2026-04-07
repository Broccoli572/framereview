import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * useAuth – convenience hook that wraps the auth store.
 *
 * - On mount, fetches the current user if a token exists but user is null.
 * - Returns all auth state + actions for easy consumption.
 */
export default function useAuth() {
  const navigate = useNavigate();
  const store = useAuthStore();
  const { token, user, isLoading, fetchUser, logout: logoutAction } = store;

  useEffect(() => {
    if (token && !user && !isLoading) {
      fetchUser();
    }
  }, [token, user, isLoading, fetchUser]);

  const logout = async () => {
    await logoutAction();
    navigate('/login');
  };

  return {
    ...store,
    logout,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
  };
}
