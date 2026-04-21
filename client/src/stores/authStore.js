import { create } from 'zustand';
import { login as loginApi, logout as logoutApi, me as meApi } from '../api/auth';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  error: null,

  setTokens: ({ token, refreshToken }) => {
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

    set({
      token,
      refreshToken: refreshToken || get().refreshToken,
    });
  },

  login: async ({ email, password }) => {
    set({ error: null, isLoading: true });

    try {
      const { data } = await loginApi({ email, password });
      const { user, token, refresh_token: nextRefreshToken } = data;

      localStorage.setItem('token', token);
      if (nextRefreshToken) {
        localStorage.setItem('refresh_token', nextRefreshToken);
      }

      set({
        user,
        token,
        refreshToken: nextRefreshToken || null,
        error: null,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || '登录失败，请检查邮箱和密码后重试。';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      if (get().token) {
        await logoutApi();
      }
    } catch {
      // Ignore logout API errors and clear local state anyway.
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        token: null,
        refreshToken: null,
        error: null,
        isLoading: false,
      });
    }
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!token) {
      set({ isLoading: false });
      return false;
    }

    set({ token, refreshToken, isLoading: true });

    try {
      const { data } = await meApi();
      set({ user: data.user || data, isLoading: false, error: null });
      return true;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        error: null,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },
}));

export default useAuthStore;
export { useAuthStore };
