import { Outlet } from 'react-router-dom';
import { Film, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../stores/themeStore';
import { Moon, Sun } from 'lucide-react';

export default function ShareLayout() {
  const { darkMode, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
        <Link to="/" className="flex items-center gap-2">
          <Film size={20} className="text-brand-600 dark:text-brand-400" />
          <span className="text-base font-bold text-surface-900 dark:text-surface-100">FrameReview</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
          >
            <LogIn size={14} />
            登录
          </Link>
        </div>
      </div>

      {/* Full width content */}
      <Outlet />
    </div>
  );
}
