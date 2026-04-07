import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  darkMode:
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ||
        localStorage.getItem('theme') === 'dark'
      : false,

  toggleTheme() {
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { darkMode: next };
    });
  },

  init() {
    const isDark =
      localStorage.getItem('theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: isDark });
  },
}));
