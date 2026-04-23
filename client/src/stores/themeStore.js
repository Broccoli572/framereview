import { create } from 'zustand';

function resolveInitialDarkMode() {
  if (typeof window === 'undefined') return false;

  const storedTheme = localStorage.getItem('theme');
  return storedTheme === 'dark';
}

export const useThemeStore = create((set) => ({
  darkMode: resolveInitialDarkMode(),

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
    const isDark = resolveInitialDarkMode();
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: isDark });
  },
}));
