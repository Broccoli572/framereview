import { create } from 'zustand';
import { login as loginApi, me as meApi, logout as logoutApi } from '../api/auth';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  error: null,

  // Computed (derived boolean, not a function)
  get isAuthenticated() {
    return !!this.token && !!this.user;
  },

  // Actions
  setTokens: ({ token, refreshToken }) => {
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    set({ token, refreshToken: refreshToken || get().refreshToken });
  },

  login: async ({ email, password }) => {
    set({ error: null, isLoading: true });
    try {
      const { data } = await loginApi({ email, password });
      const { user, token, refresh_token } = data;

      localStorage.setItem('token', token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }

      set({
        user,
        token,
        refreshToken: refresh_token || null,
        error: null,
        isLoading: false,
      });

      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || '登录失败，请检查邮箱和密码';
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
      // Ignore logout API errors – clear local state anyway
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
      set({ user: data.user || data, isLoading: false });
      return true;
    } catch {
      // Token invalid – clear everything
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      set({ user: null, token: null, refreshToken: null, isLoading: false });
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
